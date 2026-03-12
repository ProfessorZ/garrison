import logging
import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.permissions import require_server_access
from app.auth.security import decrypt_rcon_password
from app.database import get_db
from app.games.registry import get_plugin
from app.models.server import Server
from app.models.user import User, UserRole
from app.schemas.server_options import ServerOption, ServerOptionUpdate, BulkOptionUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/servers", tags=["server-options"])

# ── Options cache: server_id -> (timestamp, options_list) ────────────────────
_options_cache: dict[int, tuple[float, list[ServerOption]]] = {}
CACHE_TTL = 60  # seconds


# ── Factorio options metadata ──────────────────────────────────────────────

FACTORIO_CONFIG_OPTIONS: list[str] = [
    "afk-auto-kick",
    "allow-commands",
    "autosave-interval",
    "max-players",
    "max-upload-slots",
    "max-upload-in-kilobytes-per-second",
    "name",
    "description",
    "tags",
    "password",
    "visibility-lan",
    "visibility-public",
    "require-user-verification",
    "only-admins-can-pause-the-game",
]

FACTORIO_OPTIONS_META: dict[str, dict] = {
    "afk-auto-kick": {"category": "Server", "type": "number", "description": "Kick AFK players after this many minutes (0=disabled)"},
    "allow-commands": {"category": "Server", "type": "string", "description": "Allow console commands (true/false/admins-only)"},
    "autosave-interval": {"category": "Server", "type": "number", "description": "Minutes between autosaves"},
    "max-players": {"category": "Server", "type": "number", "description": "Maximum number of players (0=unlimited)"},
    "max-upload-slots": {"category": "Network", "type": "number", "description": "Maximum upload slots"},
    "max-upload-in-kilobytes-per-second": {"category": "Network", "type": "number", "description": "Maximum upload speed (KB/s, 0=unlimited)"},
    "name": {"category": "General", "type": "string", "description": "Server name shown in browser"},
    "description": {"category": "General", "type": "string", "description": "Server description"},
    "tags": {"category": "General", "type": "string", "description": "Server tags (comma-separated)"},
    "password": {"category": "General", "type": "string", "description": "Game password (empty=no password)"},
    "visibility-lan": {"category": "Visibility", "type": "boolean", "description": "Show server on LAN"},
    "visibility-public": {"category": "Visibility", "type": "boolean", "description": "Show server in public browser"},
    "require-user-verification": {"category": "Server", "type": "boolean", "description": "Require Factorio account verification"},
    "only-admins-can-pause-the-game": {"category": "Server", "type": "boolean", "description": "Only admins can pause the game"},
}


def _parse_factorio_config_value(raw: str) -> str:
    """Extract value from Factorio /config get response."""
    raw = raw.strip()
    if ":" in raw:
        return raw.split(":", 1)[1].strip()
    if " is " in raw:
        return raw.split(" is ", 1)[1].strip()
    return raw


def _get_factorio_option_meta(name: str, value: str) -> tuple[str, str, str]:
    """Return (type, category, description) for a Factorio config option."""
    meta = FACTORIO_OPTIONS_META.get(name)
    if meta:
        return meta["type"], meta["category"], meta["description"]
    return _infer_type(value), "Other", ""


# ── PZ options metadata ─────────────────────────────────────────────────────

PZ_OPTIONS_META: dict[str, dict] = {
    # Gameplay
    "PVP": {"category": "Gameplay", "type": "boolean", "description": "Enable player vs player combat"},
    "PauseEmpty": {"category": "Gameplay", "type": "boolean", "description": "Pause the game when no players are online"},
    "SpeedLimit": {"category": "Gameplay", "type": "number", "description": "Maximum game speed (1-3)"},
    "PlayerRespawnWithSelf": {"category": "Gameplay", "type": "boolean", "description": "Allow players to respawn at their old location"},
    "PlayerRespawnWithOther": {"category": "Gameplay", "type": "boolean", "description": "Allow players to respawn near other players"},
    "SleepAllowed": {"category": "Gameplay", "type": "boolean", "description": "Allow players to sleep"},
    "SleepNeeded": {"category": "Gameplay", "type": "boolean", "description": "Players need sleep to survive"},
    "AllowDestructionBySledgehammer": {"category": "Gameplay", "type": "boolean", "description": "Allow sledgehammer destruction of structures"},
    "AllowNonAsciiUsername": {"category": "Gameplay", "type": "boolean", "description": "Allow non-ASCII characters in usernames"},
    "HoursForLootRespawn": {"category": "Gameplay", "type": "number", "description": "Hours before loot respawns (0=never)"},
    "MaxItemsForLootRespawn": {"category": "Gameplay", "type": "number", "description": "Max items in a container for loot respawn"},
    "ConstructionPreventsLootRespawn": {"category": "Gameplay", "type": "boolean", "description": "Player constructions prevent loot respawn"},
    "DropOffWhiteListAfterDeath": {"category": "Gameplay", "type": "boolean", "description": "Remove player from whitelist after death"},
    "BloodSplatLifespanDays": {"category": "Gameplay", "type": "number", "description": "Days before blood splats disappear (0=never)"},
    "AllowCoop": {"category": "Gameplay", "type": "boolean", "description": "Allow cooperative play"},

    # Vehicles
    "CarEngineAttractionModifier": {"category": "Vehicles", "type": "number", "description": "Car engine zombie attraction multiplier"},

    # Safehouse
    "PlayerSafehouse": {"category": "Safehouse", "type": "boolean", "description": "Allow player safehouses"},
    "AdminSafehouse": {"category": "Safehouse", "type": "boolean", "description": "Only admins can create safehouses"},
    "SafehouseAllowTrepass": {"category": "Safehouse", "type": "boolean", "description": "Allow trespassing in safehouses"},
    "SafehouseAllowFire": {"category": "Safehouse", "type": "boolean", "description": "Allow fire in safehouses"},
    "SafehouseAllowLoot": {"category": "Safehouse", "type": "boolean", "description": "Allow looting in safehouses"},
    "SafehouseAllowRespawn": {"category": "Safehouse", "type": "boolean", "description": "Allow respawning in safehouses"},
    "SafehouseDaySurvivedToClaim": {"category": "Safehouse", "type": "number", "description": "Days survived before claiming safehouse"},
    "SafeHouseRemovalTime": {"category": "Safehouse", "type": "number", "description": "Hours before removing inactive safehouse"},
    "AllowSafehouse": {"category": "Safehouse", "type": "boolean", "description": "Enable safehouse system"},

    # Chat
    "ChatMessageCharacterLimit": {"category": "Chat", "type": "number", "description": "Maximum characters per chat message"},
    "GlobalChat": {"category": "Chat", "type": "boolean", "description": "Enable global chat"},
    "ServerWelcomeMessage": {"category": "Chat", "type": "string", "description": "Welcome message shown to players on join"},

    # Anti-Cheat
    "DoLuaChecksum": {"category": "Anti-Cheat", "type": "boolean", "description": "Enable Lua script checksum verification"},
    "KickFastPlayers": {"category": "Anti-Cheat", "type": "boolean", "description": "Kick players moving too fast"},
    "AntiCheatProtectionType1": {"category": "Anti-Cheat", "type": "boolean", "description": "Type 1 anti-cheat (inventory)"},
    "AntiCheatProtectionType2": {"category": "Anti-Cheat", "type": "boolean", "description": "Type 2 anti-cheat (building)"},
    "AntiCheatProtectionType3": {"category": "Anti-Cheat", "type": "boolean", "description": "Type 3 anti-cheat (general)"},
    "AntiCheatProtectionType4": {"category": "Anti-Cheat", "type": "boolean", "description": "Type 4 anti-cheat (teleport)"},
    "AntiCheatProtectionType20": {"category": "Anti-Cheat", "type": "boolean", "description": "Type 20 anti-cheat (speed)"},
    "AntiCheatProtectionType22": {"category": "Anti-Cheat", "type": "boolean", "description": "Type 22 anti-cheat (advanced)"},
    "AntiCheatProtectionType24": {"category": "Anti-Cheat", "type": "boolean", "description": "Type 24 anti-cheat (mechanic)"},

    # Server
    "MaxPlayers": {"category": "Server", "type": "number", "description": "Maximum number of players"},
    "PingLimit": {"category": "Server", "type": "number", "description": "Maximum ping before kick (0=disabled)"},
    "BackupsCount": {"category": "Server", "type": "number", "description": "Number of backups to keep"},
    "BackupsPeriod": {"category": "Server", "type": "number", "description": "Minutes between backups (0=disabled)"},
    "SaveWorldEveryMinutes": {"category": "Server", "type": "number", "description": "Minutes between world saves"},
    "LoginQueueEnabled": {"category": "Server", "type": "boolean", "description": "Enable login queue when server is full"},
    "LoginQueueConnectTimeout": {"category": "Server", "type": "number", "description": "Seconds before login queue timeout"},
    "Open": {"category": "Server", "type": "boolean", "description": "Server is open to public"},
    "AutoCreateUserInWhiteList": {"category": "Server", "type": "boolean", "description": "Auto-add connecting users to whitelist"},
    "DisplayUserName": {"category": "Server", "type": "boolean", "description": "Display player names overhead"},
    "ShowFirstAndLastName": {"category": "Server", "type": "boolean", "description": "Show character first and last name"},

    # Map
    "Map": {"category": "Map", "type": "string", "description": "Map name (e.g. Muldraugh, KY)"},
    "SpawnPoint": {"category": "Map", "type": "string", "description": "Default spawn point coordinates"},
    "SpawnItems": {"category": "Map", "type": "string", "description": "Items given to players on spawn"},

    # Mods
    "Mods": {"category": "Mods", "type": "string", "description": "Semicolon-separated list of active mod IDs"},
    "WorkshopItems": {"category": "Mods", "type": "string", "description": "Semicolon-separated list of Workshop item IDs"},

    # Voice
    "VoiceEnable": {"category": "Voice", "type": "boolean", "description": "Enable in-game voice chat"},
    "VoiceMinDistance": {"category": "Voice", "type": "number", "description": "Minimum distance for voice falloff"},
    "VoiceMaxDistance": {"category": "Voice", "type": "number", "description": "Maximum distance for voice"},
}


def _infer_type(value: str) -> str:
    if value.lower() in ("true", "false"):
        return "boolean"
    try:
        float(value)
        return "number"
    except ValueError:
        return "string"


def _get_option_meta(name: str, value: str) -> tuple[str, str, str]:
    """Return (type, category, description) for a given option."""
    meta = PZ_OPTIONS_META.get(name)
    if meta:
        return meta["type"], meta["category"], meta["description"]
    return _infer_type(value), "Other", ""


def _parse_options(raw: str) -> list[ServerOption]:
    """Parse PZ showoptions output into structured options."""
    options = []
    for line in raw.strip().splitlines():
        line = line.strip()
        if line.startswith("*"):
            line = line[1:].strip()
        if "=" not in line:
            continue
        name, _, value = line.partition("=")
        name = name.strip()
        value = value.strip()
        opt_type, category, description = _get_option_meta(name, value)
        options.append(ServerOption(
            name=name,
            value=value,
            type=opt_type,
            category=category,
            description=description,
        ))
    return options


async def _get_server(server_id: int, db: AsyncSession) -> Server:
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return server


async def _rcon_command(server: Server, command: str) -> str:
    plugin = get_plugin(server.game_type)
    password = decrypt_rcon_password(server.rcon_password_encrypted)
    await plugin.connect(server.host, server.rcon_port, password, server_id=server.id)
    try:
        return await plugin.send_command(command)
    finally:
        await plugin.disconnect()


# ── Routes ───────────────────────────────────────────────────────────────────

async def _fetch_factorio_options(server: Server) -> list[ServerOption]:
    """Fetch all known Factorio config options via /config get."""
    options = []
    for opt_name in FACTORIO_CONFIG_OPTIONS:
        try:
            raw = await _rcon_command(server, f"/config get {opt_name}")
            value = _parse_factorio_config_value(raw)
        except Exception:
            value = ""
        opt_type, category, description = _get_factorio_option_meta(opt_name, value)
        options.append(ServerOption(
            name=opt_name,
            value=value,
            type=opt_type,
            category=category,
            description=description,
        ))
    return options


@router.get("/{server_id}/options", response_model=list[ServerOption])
async def get_server_options(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    # Check cache
    cached = _options_cache.get(server_id)
    if cached and (time.time() - cached[0]) < CACHE_TTL:
        return cached[1]

    server = await _get_server(server_id, db)

    if server.game_type == "factorio":
        options = await _fetch_factorio_options(server)
    else:
        raw = await _rcon_command(server, "showoptions")
        options = _parse_options(raw)

    _options_cache[server_id] = (time.time(), options)
    return options


@router.put("/{server_id}/options/{option_name}", response_model=ServerOption)
async def update_server_option(
    server_id: int,
    option_name: str,
    data: ServerOptionUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.ADMIN)),
):
    server = await _get_server(server_id, db)

    if server.game_type == "factorio":
        result = await _rcon_command(server, f"/config set {option_name} {data.value}")
        logger.info("/config set %s %s on server %s: %s", option_name, data.value, server_id, result)
        opt_type, category, description = _get_factorio_option_meta(option_name, data.value)
    else:
        result = await _rcon_command(server, f'changeoption {option_name} "{data.value}"')
        logger.info("changeoption %s=%s on server %s: %s", option_name, data.value, server_id, result)
        opt_type, category, description = _get_option_meta(option_name, data.value)

    # Invalidate cache
    _options_cache.pop(server_id, None)

    return ServerOption(
        name=option_name,
        value=data.value,
        type=opt_type,
        category=category,
        description=description,
    )


@router.put("/{server_id}/options", response_model=list[ServerOption])
async def bulk_update_options(
    server_id: int,
    data: BulkOptionUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.ADMIN)),
):
    server = await _get_server(server_id, db)
    is_factorio = server.game_type == "factorio"
    updated = []
    for name, value in data.options.items():
        if is_factorio:
            result = await _rcon_command(server, f"/config set {name} {value}")
            logger.info("/config set %s %s on server %s: %s", name, value, server_id, result)
            opt_type, category, description = _get_factorio_option_meta(name, value)
        else:
            result = await _rcon_command(server, f'changeoption {name} "{value}"')
            logger.info("changeoption %s=%s on server %s: %s", name, value, server_id, result)
            opt_type, category, description = _get_option_meta(name, value)
        updated.append(ServerOption(
            name=name,
            value=value,
            type=opt_type,
            category=category,
            description=description,
        ))

    # Invalidate cache
    _options_cache.pop(server_id, None)
    return updated
