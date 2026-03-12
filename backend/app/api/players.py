from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.permissions import require_server_access
from app.auth.security import decrypt_rcon_password
from app.database import get_db
from app.plugins.bridge import get_plugin
from app.models.server import Server
from app.models.user import User, UserRole
from app.models.activity_log import ActionType
from app.models.known_player import KnownPlayer
from app.models.player_session import PlayerSession
from app.api.activity import log_activity

router = APIRouter(prefix="/api/servers", tags=["players"])


async def _get_server_plugin(server_id: int, db: AsyncSession):
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    plugin = get_plugin(server.game_type)
    password = decrypt_rcon_password(server.rcon_password_encrypted)
    await plugin.connect(server.host, server.rcon_port, password, server_id=server.id)
    return server, plugin


@router.get("/{server_id}/players")
async def list_players(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.VIEWER)),
):
    server, plugin = await _get_server_plugin(server_id, db)
    try:
        players = await plugin.get_players()
    finally:
        await plugin.disconnect()

    # Enrich with KnownPlayer data
    enriched = []
    for p in players:
        name = p.get("name", "")
        entry = {"name": name}

        kp_result = await db.execute(select(KnownPlayer).where(KnownPlayer.name == name))
        kp = kp_result.scalar_one_or_none()
        if kp:
            entry["known_player_id"] = kp.id
            entry["total_playtime_seconds"] = kp.total_playtime_seconds
            entry["session_count"] = kp.session_count
            entry["is_banned"] = kp.is_banned
            entry["first_seen"] = kp.first_seen.isoformat() if kp.first_seen else None

            # Per-server stats
            srv_sessions = await db.execute(
                select(
                    func.count(PlayerSession.id),
                    func.coalesce(func.sum(PlayerSession.duration_seconds), 0),
                    func.min(PlayerSession.joined_at),
                ).where(
                    PlayerSession.player_id == kp.id,
                    PlayerSession.server_id == server_id,
                )
            )
            row = srv_sessions.one()
            entry["sessions_on_server"] = row[0]
            entry["total_time_on_server"] = row[1]
            entry["first_seen_on_server"] = row[2].isoformat() if row[2] else None

        enriched.append(entry)

    return {"players": enriched}


@router.post("/{server_id}/players/{player_name}/kick")
async def kick_player(
    server_id: int,
    player_name: str,
    reason: str = "",
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    server, plugin = await _get_server_plugin(server_id, db)
    try:
        result = await plugin.kick_player(player_name, reason)
    finally:
        await plugin.disconnect()
    await log_activity(db, server_id=server_id, user_id=_user.id, action=ActionType.KICK, detail=f"Kicked {player_name}" + (f": {reason}" if reason else ""))
    await db.commit()
    return {"result": result}


@router.post("/{server_id}/players/{player_name}/ban")
async def ban_player(
    server_id: int,
    player_name: str,
    reason: str = "",
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    server, plugin = await _get_server_plugin(server_id, db)
    try:
        result = await plugin.ban_player(player_name, reason)
    finally:
        await plugin.disconnect()
    await log_activity(db, server_id=server_id, user_id=_user.id, action=ActionType.BAN, detail=f"Banned {player_name}" + (f": {reason}" if reason else ""))
    await db.commit()
    return {"result": result}


@router.post("/{server_id}/players/{player_name}/unban")
async def unban_player(
    server_id: int,
    player_name: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    _server, plugin = await _get_server_plugin(server_id, db)
    try:
        if hasattr(plugin, "unban_player"):
            result = await plugin.unban_player(player_name)
        else:
            result = await plugin.send_command(f'unbanuser "{player_name}"')
    finally:
        await plugin.disconnect()
    await log_activity(db, server_id=server_id, user_id=_user.id, action=ActionType.UNBAN, detail=f"Unbanned {player_name}")
    await db.commit()
    return {"result": result}


@router.get("/{server_id}/chat")
async def get_chat(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.VIEWER)),
):
    server, plugin = await _get_server_plugin(server_id, db)
    try:
        chat = await plugin.get_chat()
    finally:
        await plugin.disconnect()
    return {"messages": chat}
