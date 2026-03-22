from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
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

            # Steam fields
            entry["steam_id"] = kp.steam_id
            entry["vac_banned"] = kp.vac_banned
            entry["game_banned"] = kp.game_banned
            entry["steam_avatar_url"] = kp.steam_avatar_url
            entry["steam_persona_name"] = kp.steam_persona_name

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
    # Discord notification
    from app.services.discord_webhooks import notify_player_kick
    try:
        await notify_player_kick(server_id, server.name, server.game_type, player_name, reason, _user.username)
    except Exception:
        pass
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
    # Discord notification
    from app.services.discord_webhooks import notify_player_ban
    try:
        await notify_player_ban(server_id, server.name, server.game_type, player_name, reason, _user.username)
    except Exception:
        pass
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


# ── Request models for new player actions ────────────────────────────


class TeleportRequest(BaseModel):
    x: float
    y: float
    z: float


class GiveItemRequest(BaseModel):
    item: str
    count: int = 1


class MessagePlayerRequest(BaseModel):
    message: str


class ChangeMapRequest(BaseModel):
    map_name: str


# ── Teleport ─────────────────────────────────────────────────────────


@router.post("/{server_id}/players/{player_name}/teleport")
async def teleport_player(
    server_id: int,
    player_name: str,
    data: TeleportRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    server, plugin = await _get_server_plugin(server_id, db)
    try:
        result = await plugin.teleport_player(player_name, data.x, data.y, data.z)
    finally:
        await plugin.disconnect()
    await log_activity(
        db, server_id=server_id, user_id=_user.id, action=ActionType.COMMAND,
        detail=f"Teleported {player_name} to ({data.x}, {data.y}, {data.z})",
    )
    await db.commit()
    return {"result": result}


# ── Give Item ────────────────────────────────────────────────────────


@router.post("/{server_id}/players/{player_name}/give-item")
async def give_item(
    server_id: int,
    player_name: str,
    data: GiveItemRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    server, plugin = await _get_server_plugin(server_id, db)
    try:
        result = await plugin.give_item(player_name, data.item, data.count)
    finally:
        await plugin.disconnect()
    await log_activity(
        db, server_id=server_id, user_id=_user.id, action=ActionType.COMMAND,
        detail=f"Gave {player_name} {data.count}x {data.item}",
    )
    await db.commit()
    return {"result": result}


# ── Message Player ───────────────────────────────────────────────────


@router.post("/{server_id}/players/{player_name}/message")
async def message_player(
    server_id: int,
    player_name: str,
    data: MessagePlayerRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    server, plugin = await _get_server_plugin(server_id, db)
    try:
        result = await plugin.message_player(player_name, data.message)
    finally:
        await plugin.disconnect()
    await log_activity(
        db, server_id=server_id, user_id=_user.id, action=ActionType.COMMAND,
        detail=f"Messaged {player_name}",
    )
    await db.commit()
    return {"result": result}


# ── Maps ─────────────────────────────────────────────────────────────


@router.get("/{server_id}/maps")
async def get_maps(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.VIEWER)),
):
    server, plugin = await _get_server_plugin(server_id, db)
    try:
        maps = await plugin.get_maps()
    finally:
        await plugin.disconnect()
    return {"maps": maps}


@router.post("/{server_id}/change-map")
async def change_map(
    server_id: int,
    data: ChangeMapRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    server, plugin = await _get_server_plugin(server_id, db)
    try:
        result = await plugin.change_map(data.map_name)
    finally:
        await plugin.disconnect()
    await log_activity(
        db, server_id=server_id, user_id=_user.id, action=ActionType.COMMAND,
        detail=f"Changed map to {data.map_name}",
    )
    await db.commit()
    return {"result": result}


class PromoteRequest(BaseModel):
    role: str


@router.get("/{server_id}/roles")
async def get_roles(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.VIEWER)),
):
    """Return available player roles for this game type."""
    server, plugin = await _get_server_plugin(server_id, db)
    try:
        roles = await plugin.get_player_roles()
    except NotImplementedError:
        roles = []
    finally:
        await plugin.disconnect()
    return {"roles": roles}


@router.post("/{server_id}/players/{player_name}/promote")
async def promote_player(
    server_id: int,
    player_name: str,
    data: PromoteRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.ADMIN)),
):
    server, plugin = await _get_server_plugin(server_id, db)
    try:
        result = await plugin.promote_player(player_name, data.role)
    finally:
        await plugin.disconnect()
    await log_activity(
        db, server_id=server_id, user_id=_user.id, action=ActionType.COMMAND,
        detail=f"Promoted {player_name} to {data.role}",
    )
    await db.commit()
    return {"ok": True, "result": result}


@router.post("/{server_id}/players/{player_name}/demote")
async def demote_player(
    server_id: int,
    player_name: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.ADMIN)),
):
    server, plugin = await _get_server_plugin(server_id, db)
    try:
        result = await plugin.demote_player(player_name)
    finally:
        await plugin.disconnect()
    await log_activity(
        db, server_id=server_id, user_id=_user.id, action=ActionType.COMMAND,
        detail=f"Demoted {player_name}",
    )
    await db.commit()
    return {"ok": True, "result": result}
