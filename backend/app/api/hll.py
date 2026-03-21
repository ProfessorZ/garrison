"""HLL-specific REST endpoints.

All endpoints connect to the HLL game server via the HLL plugin's custom
JSON+XOR TCP RCON protocol and return structured data.
"""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.permissions import require_server_access
from app.auth.security import decrypt_rcon_password
from app.database import get_db
from app.models.activity_log import ActionType
from app.models.server import Server
from app.models.user import User, UserRole
from app.plugins.bridge import get_plugin, ConnectedPlugin
from app.api.activity import log_activity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/servers", tags=["hll"])


# ── Helpers ──────────────────────────────────────────────────────────


async def _get_hll_plugin(server_id: int, db: AsyncSession) -> tuple[ConnectedPlugin, Server]:
    """Look up the server, verify it's HLL, connect the plugin, and return both."""
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(404, "Server not found")
    if server.game_type != "hll":
        raise HTTPException(400, "Server is not an HLL server")
    plugin = get_plugin("hll")
    password = decrypt_rcon_password(server.rcon_password_encrypted)
    await plugin.connect(server.host, server.rcon_port, password, server_id=server.id)
    return plugin, server


async def _hll_command(plugin: ConnectedPlugin, command: str, content=None) -> str:
    """Send an HLL command and return raw response. Raises HTTPException on error."""
    try:
        raw = await plugin.send_command(command, content if content is not None else "")
        return raw
    except Exception as e:
        logger.error("HLL command %s failed: %s", command, e)
        raise HTTPException(502, f"HLL RCON command failed: {e}")


def _parse_json(raw: str, label: str = "response"):
    """Parse JSON from HLL response, raising 502 on failure."""
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        logger.warning("Failed to parse HLL %s: %s", label, raw[:200] if raw else "(empty)")
        raise HTTPException(502, f"Invalid JSON in HLL {label}")


# ── Request/Response models ─────────────────────────────────────────


class AddMapRequest(BaseModel):
    map_name: str
    after_map_name: str = ""
    after_map_repetition: int = 0


class ChangeMapRequest(BaseModel):
    map_name: str


class BroadcastRequest(BaseModel):
    message: str


class KickRequest(BaseModel):
    reason: str = ""


class PunishRequest(BaseModel):
    reason: str = ""


class TempBanRequest(BaseModel):
    duration_hours: int
    reason: str = ""


class PermBanRequest(BaseModel):
    reason: str = ""


class MessagePlayerRequest(BaseModel):
    message: str


class SwitchTeamRequest(BaseModel):
    force: bool = False


class UpdateSettingsRequest(BaseModel):
    autobalance_enabled: Optional[bool] = None
    autobalance_threshold: Optional[int] = None
    team_switch_cooldown: Optional[int] = None
    idle_kick_minutes: Optional[int] = None
    max_ping: Optional[int] = None
    vote_kick_enabled: Optional[bool] = None


class AddVipRequest(BaseModel):
    player_id: str
    comment: str = ""


# ── Map Rotation ─────────────────────────────────────────────────────


@router.get("/{server_id}/hll/map-rotation")
async def get_map_rotation(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.VIEWER)),
):
    plugin, server = await _get_hll_plugin(server_id, db)
    try:
        raw = await _hll_command(plugin, "GetServerInformation",
                                 {"Name": "maprotation", "Value": ""})
        return _parse_json(raw, "map rotation")
    finally:
        await plugin.disconnect()


@router.post("/{server_id}/hll/map-rotation")
async def add_map_to_rotation(
    server_id: int,
    data: AddMapRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    plugin, server = await _get_hll_plugin(server_id, db)
    try:
        raw = await _hll_command(plugin, "AddMapToRotation", {
            "MapName": data.map_name,
            "AfterMapName": data.after_map_name,
            "AfterMapRepetition": data.after_map_repetition,
        })
        await log_activity(db, server_id=server_id, user_id=_user.id,
                           action=ActionType.COMMAND, detail=f"HLL: add map {data.map_name}")
        await db.commit()
        return {"ok": True, "result": raw}
    finally:
        await plugin.disconnect()


@router.delete("/{server_id}/hll/map-rotation/{map_name}")
async def remove_map_from_rotation(
    server_id: int,
    map_name: str,
    repetition: int = 0,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    plugin, server = await _get_hll_plugin(server_id, db)
    try:
        raw = await _hll_command(plugin, "RemoveMapFromRotation", {
            "MapName": map_name,
            "MapRepetition": repetition,
        })
        await log_activity(db, server_id=server_id, user_id=_user.id,
                           action=ActionType.COMMAND, detail=f"HLL: remove map {map_name}")
        await db.commit()
        return {"ok": True, "result": raw}
    finally:
        await plugin.disconnect()


# ── Map Sequence ─────────────────────────────────────────────────────


@router.get("/{server_id}/hll/map-sequence")
async def get_map_sequence(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.VIEWER)),
):
    plugin, server = await _get_hll_plugin(server_id, db)
    try:
        raw = await _hll_command(plugin, "GetServerInformation",
                                 {"Name": "mapsequence", "Value": ""})
        return _parse_json(raw, "map sequence")
    finally:
        await plugin.disconnect()


# ── Change Map ───────────────────────────────────────────────────────


@router.post("/{server_id}/hll/change-map")
async def change_map(
    server_id: int,
    data: ChangeMapRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    plugin, server = await _get_hll_plugin(server_id, db)
    try:
        raw = await _hll_command(plugin, "ChangeMap", {"MapName": data.map_name})
        await log_activity(db, server_id=server_id, user_id=_user.id,
                           action=ActionType.COMMAND, detail=f"HLL: change map to {data.map_name}")
        await db.commit()
        return {"ok": True, "result": raw}
    finally:
        await plugin.disconnect()


# ── Available Maps ───────────────────────────────────────────────────


@router.get("/{server_id}/hll/available-maps")
async def get_available_maps(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.VIEWER)),
):
    plugin, server = await _get_hll_plugin(server_id, db)
    try:
        raw = await _hll_command(plugin, "GetClientReferenceData", "AddMapToRotation")
        data = _parse_json(raw, "available maps")
        if isinstance(data, dict) and "maps" in data:
            return {"maps": data["maps"]}
        return {"maps": data if isinstance(data, list) else []}
    finally:
        await plugin.disconnect()


# ── Server Settings ──────────────────────────────────────────────────


@router.get("/{server_id}/hll/settings")
async def get_hll_settings(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    plugin, server = await _get_hll_plugin(server_id, db)
    try:
        results = {}
        raw = await _hll_command(plugin, "GetAutoBalanceEnabled")
        results["autobalance_enabled"] = _parse_json(raw, "autobalance").get("enable", False)

        raw = await _hll_command(plugin, "GetAutoBalanceThreshold")
        results["autobalance_threshold"] = _parse_json(raw, "autobalance threshold").get("autoBalanceThreshold", 0)

        raw = await _hll_command(plugin, "GetTeamSwitchCooldown")
        results["team_switch_cooldown"] = _parse_json(raw, "team switch cooldown").get("teamSwitchTimer", 0)

        raw = await _hll_command(plugin, "GetKickIdleDuration")
        results["idle_kick_minutes"] = _parse_json(raw, "idle kick").get("idleTimeoutMinutes", 0)

        raw = await _hll_command(plugin, "GetHighPingThreshold")
        results["max_ping"] = _parse_json(raw, "high ping").get("highPingLimit", 0)

        raw = await _hll_command(plugin, "GetVoteKickEnabled")
        results["vote_kick_enabled"] = _parse_json(raw, "vote kick").get("enable", False)

        return results
    finally:
        await plugin.disconnect()


@router.post("/{server_id}/hll/settings")
async def update_hll_settings(
    server_id: int,
    data: UpdateSettingsRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.ADMIN)),
):
    plugin, server = await _get_hll_plugin(server_id, db)
    try:
        settings_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        if not settings_dict:
            raise HTTPException(400, "No settings provided")

        results = {}
        if "autobalance_enabled" in settings_dict:
            raw = await _hll_command(plugin, "SetAutoBalanceEnabled",
                                     {"enable": settings_dict["autobalance_enabled"]})
            results["autobalance_enabled"] = raw

        if "autobalance_threshold" in settings_dict:
            raw = await _hll_command(plugin, "SetAutoBalanceThreshold",
                                     {"autoBalanceThreshold": settings_dict["autobalance_threshold"]})
            results["autobalance_threshold"] = raw

        if "team_switch_cooldown" in settings_dict:
            raw = await _hll_command(plugin, "SetTeamSwitchCooldown",
                                     {"teamSwitchTimer": settings_dict["team_switch_cooldown"]})
            results["team_switch_cooldown"] = raw

        if "idle_kick_minutes" in settings_dict:
            raw = await _hll_command(plugin, "SetKickIdleDuration",
                                     {"idleTimeoutMinutes": settings_dict["idle_kick_minutes"]})
            results["idle_kick_minutes"] = raw

        if "max_ping" in settings_dict:
            raw = await _hll_command(plugin, "SetHighPingThreshold",
                                     {"highPingLimit": settings_dict["max_ping"]})
            results["max_ping"] = raw

        if "vote_kick_enabled" in settings_dict:
            raw = await _hll_command(plugin, "SetVoteKickEnabled",
                                     {"enable": settings_dict["vote_kick_enabled"]})
            results["vote_kick_enabled"] = raw

        await log_activity(db, server_id=server_id, user_id=_user.id,
                           action=ActionType.COMMAND,
                           detail=f"HLL: update settings {list(settings_dict.keys())}")
        await db.commit()
        return {"ok": True, "result": results}
    finally:
        await plugin.disconnect()


# ── Broadcast ────────────────────────────────────────────────────────


@router.post("/{server_id}/hll/broadcast")
async def broadcast_message(
    server_id: int,
    data: BroadcastRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    plugin, server = await _get_hll_plugin(server_id, db)
    try:
        raw = await _hll_command(plugin, "ServerBroadcast", {"Message": data.message})
        await log_activity(db, server_id=server_id, user_id=_user.id,
                           action=ActionType.COMMAND,
                           detail=f"HLL: broadcast \"{data.message[:100]}\"")
        await db.commit()
        return {"ok": True, "result": raw}
    finally:
        await plugin.disconnect()


# ── Player Actions ───────────────────────────────────────────────────


@router.post("/{server_id}/hll/players/{player_id}/kick")
async def kick_player(
    server_id: int,
    player_id: str,
    data: KickRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    plugin, server = await _get_hll_plugin(server_id, db)
    try:
        raw = await _hll_command(plugin, "KickPlayer", {
            "PlayerId": player_id, "Reason": data.reason,
        })
        await log_activity(db, server_id=server_id, user_id=_user.id,
                           action=ActionType.KICK,
                           detail=f"HLL: kick {player_id} — {data.reason}")
        await db.commit()
        return {"ok": True, "result": raw}
    finally:
        await plugin.disconnect()


@router.post("/{server_id}/hll/players/{player_id}/punish")
async def punish_player(
    server_id: int,
    player_id: str,
    data: PunishRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    plugin, server = await _get_hll_plugin(server_id, db)
    try:
        raw = await _hll_command(plugin, "PunishPlayer", {
            "PlayerId": player_id, "Reason": data.reason,
        })
        await log_activity(db, server_id=server_id, user_id=_user.id,
                           action=ActionType.COMMAND,
                           detail=f"HLL: punish {player_id} — {data.reason}")
        await db.commit()
        return {"ok": True, "result": raw}
    finally:
        await plugin.disconnect()


@router.post("/{server_id}/hll/players/{player_id}/temp-ban")
async def temp_ban_player(
    server_id: int,
    player_id: str,
    data: TempBanRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    plugin, server = await _get_hll_plugin(server_id, db)
    try:
        raw = await _hll_command(plugin, "TemporaryBanPlayer", {
            "PlayerId": player_id,
            "Duration": data.duration_hours,
            "Reason": data.reason,
            "AdminName": "",
        })
        await log_activity(db, server_id=server_id, user_id=_user.id,
                           action=ActionType.BAN,
                           detail=f"HLL: temp ban {player_id} {data.duration_hours}h — {data.reason}")
        await db.commit()
        return {"ok": True, "result": raw}
    finally:
        await plugin.disconnect()


@router.post("/{server_id}/hll/players/{player_id}/perm-ban")
async def perm_ban_player(
    server_id: int,
    player_id: str,
    data: PermBanRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    plugin, server = await _get_hll_plugin(server_id, db)
    try:
        raw = await _hll_command(plugin, "PermanentBanPlayer", {
            "PlayerId": player_id,
            "Reason": data.reason,
            "AdminName": "",
        })
        await log_activity(db, server_id=server_id, user_id=_user.id,
                           action=ActionType.BAN,
                           detail=f"HLL: perm ban {player_id} — {data.reason}")
        await db.commit()
        return {"ok": True, "result": raw}
    finally:
        await plugin.disconnect()


@router.post("/{server_id}/hll/players/{player_id}/message")
async def message_player(
    server_id: int,
    player_id: str,
    data: MessagePlayerRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    plugin, server = await _get_hll_plugin(server_id, db)
    try:
        raw = await _hll_command(plugin, "MessagePlayer", {
            "PlayerId": player_id, "Message": data.message,
        })
        await log_activity(db, server_id=server_id, user_id=_user.id,
                           action=ActionType.COMMAND,
                           detail=f"HLL: message {player_id}")
        await db.commit()
        return {"ok": True, "result": raw}
    finally:
        await plugin.disconnect()


@router.post("/{server_id}/hll/players/{player_id}/switch-team")
async def switch_player_team(
    server_id: int,
    player_id: str,
    data: SwitchTeamRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    plugin, server = await _get_hll_plugin(server_id, db)
    try:
        raw = await _hll_command(plugin, "ForceTeamSwitch", {
            "PlayerId": player_id, "ForceMode": 1 if data.force else 0,
        })
        await log_activity(db, server_id=server_id, user_id=_user.id,
                           action=ActionType.COMMAND,
                           detail=f"HLL: switch team {player_id} (force={data.force})")
        await db.commit()
        return {"ok": True, "result": raw}
    finally:
        await plugin.disconnect()


# ── VIPs ─────────────────────────────────────────────────────────────


@router.get("/{server_id}/hll/vips")
async def get_vips(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    plugin, server = await _get_hll_plugin(server_id, db)
    try:
        raw = await _hll_command(plugin, "GetServerInformation",
                                 {"Name": "vipplayers", "Value": ""})
        return _parse_json(raw, "VIP list")
    finally:
        await plugin.disconnect()


@router.post("/{server_id}/hll/vips")
async def add_vip(
    server_id: int,
    data: AddVipRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.ADMIN)),
):
    plugin, server = await _get_hll_plugin(server_id, db)
    try:
        raw = await _hll_command(plugin, "AddVip", {
            "PlayerId": data.player_id, "Comment": data.comment,
        })
        await log_activity(db, server_id=server_id, user_id=_user.id,
                           action=ActionType.COMMAND,
                           detail=f"HLL: add VIP {data.player_id}")
        await db.commit()
        return {"ok": True, "result": raw}
    finally:
        await plugin.disconnect()


@router.delete("/{server_id}/hll/vips/{player_id}")
async def remove_vip(
    server_id: int,
    player_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.ADMIN)),
):
    plugin, server = await _get_hll_plugin(server_id, db)
    try:
        raw = await _hll_command(plugin, "RemoveVip", {"PlayerId": player_id})
        await log_activity(db, server_id=server_id, user_id=_user.id,
                           action=ActionType.COMMAND,
                           detail=f"HLL: remove VIP {player_id}")
        await db.commit()
        return {"ok": True, "result": raw}
    finally:
        await plugin.disconnect()


# ── Players (HLL-specific list) ─────────────────────────────────────


@router.get("/{server_id}/hll/players")
async def get_hll_players(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.VIEWER)),
):
    plugin, server = await _get_hll_plugin(server_id, db)
    try:
        raw = await _hll_command(plugin, "GetServerInformation",
                                 {"Name": "players", "Value": ""})
        return _parse_json(raw, "players")
    finally:
        await plugin.disconnect()


# ── Session Info ─────────────────────────────────────────────────────


@router.get("/{server_id}/hll/session")
async def get_hll_session(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.VIEWER)),
):
    plugin, server = await _get_hll_plugin(server_id, db)
    try:
        raw = await _hll_command(plugin, "GetServerInformation",
                                 {"Name": "session", "Value": ""})
        return _parse_json(raw, "session")
    finally:
        await plugin.disconnect()
