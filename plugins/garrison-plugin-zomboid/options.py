"""Project Zomboid server options handler — showoptions / changeoption."""

from app.plugins.base import ServerOption

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
    """Return (type, category, description) for a given PZ option."""
    meta = PZ_OPTIONS_META.get(name)
    if meta:
        return meta["type"], meta["category"], meta["description"]
    return _infer_type(value), "Other", ""


def parse_options(raw: str) -> list[ServerOption]:
    """Parse PZ showoptions output into structured ServerOption list."""
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
            option_type=opt_type,
            category=category,
            description=description,
        ))
    return options
