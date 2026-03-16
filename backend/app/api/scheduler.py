import logging
from datetime import datetime, timezone

from croniter import croniter
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.activity import log_activity
from app.auth.security import decrypt_rcon_password
from app.auth.permissions import require_server_access
from app.database import get_db, async_session
from app.plugins.bridge import get_plugin
from app.models.activity_log import ActionType
from app.models.scheduled_command import ScheduledCommand
from app.models.server import Server
from app.models.user import User, UserRole
from app.schemas.scheduler import (
    ScheduledCommandCreate,
    ScheduledCommandUpdate,
    ScheduledCommandOut,
    SchedulePreset,
    SchedulePresetCommand,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/servers", tags=["scheduler"])

# ── Presets ──────────────────────────────────────────────────────────────────

PRESETS: list[SchedulePreset] = [
    SchedulePreset(
        name="Auto Save (every 30 min)",
        description="Saves the world every 30 minutes",
        commands=[
            SchedulePresetCommand(name="Auto Save", command="save", cron_expression="*/30 * * * *"),
        ],
    ),
    SchedulePreset(
        name="Restart Warning Sequence (daily 4 AM)",
        description="Sends warnings at -30m, -15m, -5m, -1m then quits",
        commands=[
            SchedulePresetCommand(
                name="Restart Warning 30m",
                command='servermsg "Server restarting in 30 minutes"',
                cron_expression="30 3 * * *",
            ),
            SchedulePresetCommand(
                name="Restart Warning 15m",
                command='servermsg "Server restarting in 15 minutes"',
                cron_expression="45 3 * * *",
            ),
            SchedulePresetCommand(
                name="Restart Warning 5m",
                command='servermsg "Server restarting in 5 minutes — save your progress!"',
                cron_expression="55 3 * * *",
            ),
            SchedulePresetCommand(
                name="Restart Warning 1m",
                command='servermsg "Server restarting in 1 minute!"',
                cron_expression="59 3 * * *",
            ),
            SchedulePresetCommand(
                name="Restart Execute",
                command="quit",
                cron_expression="0 4 * * *",
            ),
        ],
    ),
    SchedulePreset(
        name="Hourly Server Message",
        description="Broadcasts a message every hour",
        commands=[
            SchedulePresetCommand(
                name="Hourly MOTD",
                command='servermsg "Welcome to the server! Check the rules at /rules"',
                cron_expression="0 * * * *",
            ),
        ],
    ),
]


# ── Helpers ──────────────────────────────────────────────────────────────────

def _parse_cron(expression: str) -> dict:
    parts = expression.strip().split()
    if len(parts) != 5:
        raise ValueError("Cron expression must have 5 fields: minute hour day month day_of_week")
    if not croniter.is_valid(expression):
        raise ValueError(f"Invalid cron expression: {expression}")
    return {
        "minute": parts[0],
        "hour": parts[1],
        "day": parts[2],
        "month": parts[3],
        "day_of_week": parts[4],
    }


def _compute_next_run(cron_expression: str) -> datetime | None:
    try:
        ci = croniter(cron_expression, datetime.now(timezone.utc))
        return ci.get_next(datetime).replace(tzinfo=timezone.utc)
    except Exception:
        return None


async def _run_scheduled_command(scheduled_id: int):
    async with async_session() as db:
        result = await db.execute(select(ScheduledCommand).where(ScheduledCommand.id == scheduled_id))
        sc = result.scalar_one_or_none()
        if not sc or not sc.is_active:
            return
        result = await db.execute(select(Server).where(Server.id == sc.server_id))
        server = result.scalar_one_or_none()
        if not server:
            return

        plugin = get_plugin(server.game_type)
        password = decrypt_rcon_password(server.rcon_password_encrypted)
        now = datetime.now(timezone.utc)

        try:
            await plugin.connect(server.host, server.rcon_port, password, server_id=server.id)
            try:
                output = await plugin.send_command(sc.command)
            finally:
                await plugin.disconnect()

            sc.last_run = now
            sc.run_count = (sc.run_count or 0) + 1
            sc.last_result = output[:2000] if output else ""
            sc.next_run = _compute_next_run(sc.cron_expression)

            await log_activity(
                db,
                server_id=server.id,
                action=ActionType.SCHEDULED_RUN,
                detail=f"Scheduled '{sc.name}': {sc.command} → {(output or '')[:200]}",
            )
            logger.info("Scheduled command '%s' executed: %s", sc.name, (output or "")[:100])

            # Discord notification
            from app.services.discord_webhooks import notify_scheduled_command
            try:
                await notify_scheduled_command(server.id, server.name, server.game_type, sc.name, sc.command, output or "")
            except Exception:
                pass
        except Exception as e:
            sc.last_run = now
            sc.last_result = f"Error: {e}"
            logger.error("Scheduled command '%s' failed: %s", sc.name, e)

        await db.commit()


# ── ARQ cron job: poll DB for due scheduled commands ─────────────────────────

async def run_due_scheduled_commands(ctx: dict = None):
    """Called by ARQ every minute.  Finds all active scheduled commands
    whose next_run <= now and executes them, then advances next_run."""
    now = datetime.now(timezone.utc)
    async with async_session() as db:
        result = await db.execute(
            select(ScheduledCommand).where(
                ScheduledCommand.is_active.is_(True),
                ScheduledCommand.next_run <= now,
            )
        )
        due_commands = result.scalars().all()

    for sc in due_commands:
        try:
            await _run_scheduled_command(sc.id)
        except Exception as e:
            logger.error("run_due_scheduled_commands: command %s failed: %s", sc.id, e)

    # Backfill next_run for any active commands missing it
    async with async_session() as db:
        result = await db.execute(
            select(ScheduledCommand).where(
                ScheduledCommand.is_active.is_(True),
                ScheduledCommand.next_run.is_(None),
            )
        )
        for sc in result.scalars().all():
            sc.next_run = _compute_next_run(sc.cron_expression)
        await db.commit()


# ── API Routes (server-scoped) ───────────────────────────────────────────────

@router.get("/{server_id}/schedules", response_model=list[ScheduledCommandOut])
async def list_schedules(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    result = await db.execute(
        select(ScheduledCommand)
        .where(ScheduledCommand.server_id == server_id)
        .order_by(ScheduledCommand.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{server_id}/schedules", response_model=ScheduledCommandOut, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    server_id: int,
    data: ScheduledCommandCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.ADMIN)),
):
    result = await db.execute(select(Server).where(Server.id == server_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Server not found")

    try:
        _parse_cron(data.cron_expression)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    sc = ScheduledCommand(
        server_id=server_id,
        name=data.name,
        command=data.command,
        cron_expression=data.cron_expression,
        is_active=data.is_active,
        next_run=_compute_next_run(data.cron_expression),
    )
    db.add(sc)
    await db.commit()
    await db.refresh(sc)
    return sc


@router.put("/{server_id}/schedules/{schedule_id}", response_model=ScheduledCommandOut)
async def update_schedule(
    server_id: int,
    schedule_id: int,
    data: ScheduledCommandUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.ADMIN)),
):
    result = await db.execute(
        select(ScheduledCommand).where(
            ScheduledCommand.id == schedule_id,
            ScheduledCommand.server_id == server_id,
        )
    )
    sc = result.scalar_one_or_none()
    if not sc:
        raise HTTPException(status_code=404, detail="Scheduled command not found")

    update_data = data.model_dump(exclude_unset=True)
    if "cron_expression" in update_data:
        try:
            _parse_cron(update_data["cron_expression"])
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    for key, value in update_data.items():
        setattr(sc, key, value)

    if "cron_expression" in update_data:
        sc.next_run = _compute_next_run(sc.cron_expression)

    await db.commit()
    await db.refresh(sc)
    return sc


@router.delete("/{server_id}/schedules/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_schedule(
    server_id: int,
    schedule_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.ADMIN)),
):
    result = await db.execute(
        select(ScheduledCommand).where(
            ScheduledCommand.id == schedule_id,
            ScheduledCommand.server_id == server_id,
        )
    )
    sc = result.scalar_one_or_none()
    if not sc:
        raise HTTPException(status_code=404, detail="Scheduled command not found")
    await db.delete(sc)
    await db.commit()


@router.get("/{server_id}/schedules/presets", response_model=list[SchedulePreset])
async def list_presets(
    server_id: int,
    _user: User = Depends(require_server_access(UserRole.ADMIN)),
):
    return PRESETS


@router.post("/{server_id}/schedules/presets/{preset_index}", response_model=list[ScheduledCommandOut], status_code=status.HTTP_201_CREATED)
async def apply_preset(
    server_id: int,
    preset_index: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.ADMIN)),
):
    if preset_index < 0 or preset_index >= len(PRESETS):
        raise HTTPException(status_code=400, detail="Invalid preset index")

    result = await db.execute(select(Server).where(Server.id == server_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Server not found")

    preset = PRESETS[preset_index]
    created = []
    for cmd in preset.commands:
        try:
            _parse_cron(cmd.cron_expression)
        except ValueError:
            continue
        sc = ScheduledCommand(
            server_id=server_id,
            name=cmd.name,
            command=cmd.command,
            cron_expression=cmd.cron_expression,
            is_active=True,
            next_run=_compute_next_run(cmd.cron_expression),
        )
        db.add(sc)
        await db.flush()
        created.append(sc)

    await db.commit()
    for sc in created:
        await db.refresh(sc)
    return created
