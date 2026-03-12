import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.auth.permissions import require_role, require_server_access
from app.auth.security import encrypt_rcon_password, decrypt_rcon_password
from app.database import get_db, async_session
from app.plugins.bridge import get_plugin
from app.models.server import Server
from app.models.user import User, UserRole, ROLE_HIERARCHY
from app.models.server_permission import ServerPermission
from app.models.activity_log import ActionType
from app.schemas.server import ServerCreate, ServerUpdate, ServerOut, ServerStatus
from app.api.activity import log_activity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/servers", tags=["servers"])


@router.get("/", response_model=list[ServerOut])
async def list_servers(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # ADMIN+ see all servers; others see only servers they have access to
    if ROLE_HIERARCHY.get(UserRole(user.role), 0) >= ROLE_HIERARCHY[UserRole.ADMIN]:
        result = await db.execute(select(Server))
        return result.scalars().all()

    # Get server IDs user has permission for
    perm_result = await db.execute(
        select(ServerPermission.server_id).where(ServerPermission.user_id == user.id)
    )
    server_ids = [row[0] for row in perm_result.all()]
    if not server_ids:
        return []
    result = await db.execute(select(Server).where(Server.id.in_(server_ids)))
    return result.scalars().all()


@router.post("/", response_model=ServerOut, status_code=status.HTTP_201_CREATED)
async def create_server(
    data: ServerCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.ADMIN)),
):
    server = Server(
        name=data.name,
        host=data.host,
        port=data.port,
        rcon_port=data.rcon_port,
        rcon_password_encrypted=encrypt_rcon_password(data.rcon_password),
        game_type=data.game_type,
    )
    db.add(server)
    await db.flush()
    await log_activity(db, server_id=server.id, user_id=_user.id, action=ActionType.SERVER_CREATE, detail=f"Created server '{data.name}'")
    await db.commit()
    await db.refresh(server)
    return server


@router.get("/{server_id}", response_model=ServerOut)
async def get_server(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.VIEWER)),
):
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return server


@router.put("/{server_id}", response_model=ServerOut)
async def update_server(
    server_id: int,
    data: ServerUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.ADMIN)),
):
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    update_data = data.model_dump(exclude_unset=True)
    if "rcon_password" in update_data:
        update_data["rcon_password_encrypted"] = encrypt_rcon_password(update_data.pop("rcon_password"))
    for key, value in update_data.items():
        setattr(server, key, value)
    await log_activity(db, server_id=server.id, user_id=_user.id, action=ActionType.SERVER_UPDATE, detail=f"Updated server '{server.name}'")
    await db.commit()
    await db.refresh(server)
    return server


@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_server(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    server_name = server.name
    await log_activity(db, server_id=None, user_id=_user.id, action=ActionType.SERVER_DELETE, detail=f"Deleted server '{server_name}' (id={server_id})")
    await db.delete(server)
    await db.commit()


@router.get("/{server_id}/status", response_model=ServerStatus)
async def server_status(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.VIEWER)),
):
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    plugin = get_plugin(server.game_type)
    password = decrypt_rcon_password(server.rcon_password_encrypted)
    await plugin.connect(server.host, server.rcon_port, password, server_id=server.id)
    try:
        status_info = await plugin.get_status()
    finally:
        await plugin.disconnect()

    # Persist polled status
    server.last_status = status_info.get("online", False)
    server.player_count = status_info.get("player_count")
    server.last_checked = datetime.now(timezone.utc)
    await db.commit()

    return ServerStatus(
        server_id=server.id,
        name=server.name,
        online=status_info.get("online", False),
        player_count=status_info.get("player_count"),
    )


async def poll_all_servers():
    """Background task: poll every server's RCON status and persist results."""
    from app.services.discord_webhooks import notify_server_online, notify_server_offline, notify_server_error

    async with async_session() as db:
        result = await db.execute(select(Server))
        servers = result.scalars().all()
        for server in servers:
            previous_status = server.last_status
            try:
                plugin = get_plugin(server.game_type)
                password = decrypt_rcon_password(server.rcon_password_encrypted)
                await plugin.connect(server.host, server.rcon_port, password, server_id=server.id)
                try:
                    status_info = await plugin.get_status()
                finally:
                    await plugin.disconnect()
                new_status = status_info.get("online", False)
                server.last_status = new_status
                server.player_count = status_info.get("player_count")

                # Notify on status change
                if previous_status is not None and new_status != previous_status:
                    try:
                        if new_status:
                            await notify_server_online(server.id, server.name, server.game_type, server.player_count)
                        else:
                            await notify_server_offline(server.id, server.name, server.game_type)
                    except Exception:
                        pass
            except Exception as e:
                logger.warning("Status poll failed for server %s (%s): %s", server.id, server.name, e)
                if previous_status is True:
                    try:
                        await notify_server_offline(server.id, server.name, server.game_type)
                    except Exception:
                        pass
                    try:
                        await notify_server_error(server.id, server.name, server.game_type, str(e))
                    except Exception:
                        pass
                server.last_status = False
                server.player_count = None
            server.last_checked = datetime.now(timezone.utc)
        await db.commit()
