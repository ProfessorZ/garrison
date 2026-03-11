import logging

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.auth.permissions import require_role
from app.auth.security import decrypt_rcon_password
from app.database import get_db, async_session
from app.games.registry import get_plugin
from app.models.scheduled_command import ScheduledCommand
from app.models.server import Server
from app.models.user import User, UserRole
from app.schemas.scheduler import ScheduledCommandCreate, ScheduledCommandUpdate, ScheduledCommandOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/scheduled-commands", tags=["scheduler"])

scheduler = AsyncIOScheduler()


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
        await plugin.connect(server.host, server.rcon_port, password, server_id=server.id)
        try:
            output = await plugin.send_command(sc.command)
            logger.info("Scheduled command '%s' output: %s", sc.name, output)
        finally:
            await plugin.disconnect()


def _parse_cron(expression: str) -> dict:
    parts = expression.strip().split()
    if len(parts) != 5:
        raise ValueError("Cron expression must have 5 fields: minute hour day month day_of_week")
    return {
        "minute": parts[0],
        "hour": parts[1],
        "day": parts[2],
        "month": parts[3],
        "day_of_week": parts[4],
    }


def _register_job(sc: ScheduledCommand):
    job_id = f"scheduled_{sc.id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    if sc.is_active:
        cron_kwargs = _parse_cron(sc.cron_expression)
        scheduler.add_job(
            _run_scheduled_command,
            CronTrigger(**cron_kwargs),
            args=[sc.id],
            id=job_id,
        )


async def load_scheduled_jobs():
    async with async_session() as db:
        result = await db.execute(select(ScheduledCommand).where(ScheduledCommand.is_active.is_(True)))
        for sc in result.scalars().all():
            try:
                _register_job(sc)
            except Exception as e:
                logger.error("Failed to register job %s: %s", sc.id, e)

    # Register background status polling (every 30 seconds)
    from app.api.servers import poll_all_servers
    if not scheduler.get_job("status_poll"):
        scheduler.add_job(
            poll_all_servers,
            IntervalTrigger(seconds=30),
            id="status_poll",
            replace_existing=True,
        )

    # Register background chat polling (every 60 seconds)
    from app.api.chat import poll_all_chat
    if not scheduler.get_job("chat_poll"):
        scheduler.add_job(
            poll_all_chat,
            IntervalTrigger(seconds=60),
            id="chat_poll",
            replace_existing=True,
        )

    if not scheduler.running:
        scheduler.start()


@router.get("/", response_model=list[ScheduledCommandOut])
async def list_scheduled(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(ScheduledCommand))
    return result.scalars().all()


@router.post("/", response_model=ScheduledCommandOut, status_code=status.HTTP_201_CREATED)
async def create_scheduled(
    data: ScheduledCommandCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.ADMIN)),
):
    try:
        _parse_cron(data.cron_expression)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    sc = ScheduledCommand(**data.model_dump())
    db.add(sc)
    await db.commit()
    await db.refresh(sc)
    _register_job(sc)
    return sc


@router.put("/{cmd_id}", response_model=ScheduledCommandOut)
async def update_scheduled(
    cmd_id: int,
    data: ScheduledCommandUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(ScheduledCommand).where(ScheduledCommand.id == cmd_id))
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
    await db.commit()
    await db.refresh(sc)
    _register_job(sc)
    return sc


@router.delete("/{cmd_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scheduled(
    cmd_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(ScheduledCommand).where(ScheduledCommand.id == cmd_id))
    sc = result.scalar_one_or_none()
    if not sc:
        raise HTTPException(status_code=404, detail="Scheduled command not found")
    job_id = f"scheduled_{sc.id}"
    if scheduler.get_job(job_id):
        scheduler.remove_job(job_id)
    await db.delete(sc)
    await db.commit()
