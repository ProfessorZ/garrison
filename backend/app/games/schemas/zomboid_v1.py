"""Project Zomboid RCON command schema v1.0.0 — covers build 41+ and unstable."""

from app.schemas.rcon_commands import (
    CommandCategory as Cat,
    CommandParam,
    GameCommandSchema,
    ParamType,
    RconCommandSchema,
    register_schema,
)

ZOMBOID_V1 = GameCommandSchema(
    game_name="zomboid",
    schema_version="1.0.0",
    min_game_version="41.0",
    max_game_version=None,
    commands=[
        # ── PLAYER MANAGEMENT ─────────────────────────────────────────
        RconCommandSchema(
            name="additem",
            description="Give item to player",
            usage='additem "username" "module.item" count',
            category=Cat.PLAYER_MGMT,
            parameters=[
                CommandParam(name="username", type=ParamType.STRING, required=True, description="Target player name"),
                CommandParam(name="item", type=ParamType.STRING, required=True, description="Item ID (module.item format)"),
                CommandParam(name="count", type=ParamType.INTEGER, required=False, description="Number of items to give"),
            ],
        ),
        RconCommandSchema(
            name="addkey",
            description="Give key to player",
            usage='addkey "username" "keyId" "name"',
            category=Cat.PLAYER_MGMT,
            parameters=[
                CommandParam(name="username", type=ParamType.STRING, required=True, description="Target player name"),
                CommandParam(name="keyId", type=ParamType.STRING, required=True, description="Key identifier"),
                CommandParam(name="name", type=ParamType.STRING, required=True, description="Key display name"),
            ],
        ),
        RconCommandSchema(
            name="addxp",
            description="Give XP to player",
            usage='addxp "playername" perkname=xp -true',
            category=Cat.PLAYER_MGMT,
            parameters=[
                CommandParam(name="playername", type=ParamType.STRING, required=True, description="Target player name"),
                CommandParam(name="perkname", type=ParamType.STRING, required=True, description="Perk name and XP amount (perkname=xp)"),
                CommandParam(name="announce", type=ParamType.BOOLEAN, required=False, description="Announce XP gain (-true/-false)"),
            ],
        ),
        RconCommandSchema(
            name="godmod",
            description="Toggle god mode for yourself",
            usage="godmod -value",
            category=Cat.PLAYER_MGMT,
            parameters=[
                CommandParam(name="value", type=ParamType.BOOLEAN, required=False, description="Enable or disable (-true/-false)"),
            ],
        ),
        RconCommandSchema(
            name="godmodplayer",
            description="Toggle god mode for a player",
            usage='godmodplayer "username" -value',
            category=Cat.PLAYER_MGMT,
            parameters=[
                CommandParam(name="username", type=ParamType.STRING, required=True, description="Target player name"),
                CommandParam(name="value", type=ParamType.BOOLEAN, required=False, description="Enable or disable (-true/-false)"),
            ],
        ),
        RconCommandSchema(
            name="invisible",
            description="Toggle invisibility for yourself",
            usage="invisible -value",
            category=Cat.PLAYER_MGMT,
            parameters=[
                CommandParam(name="value", type=ParamType.BOOLEAN, required=False, description="Enable or disable (-true/-false)"),
            ],
        ),
        RconCommandSchema(
            name="invisibleplayer",
            description="Toggle invisibility for a player",
            usage='invisibleplayer "username" -value',
            category=Cat.PLAYER_MGMT,
            parameters=[
                CommandParam(name="username", type=ParamType.STRING, required=True, description="Target player name"),
                CommandParam(name="value", type=ParamType.BOOLEAN, required=False, description="Enable or disable (-true/-false)"),
            ],
        ),
        RconCommandSchema(
            name="noclip",
            description="Toggle noclip for a player",
            usage='noclip "username" -value',
            category=Cat.PLAYER_MGMT,
            parameters=[
                CommandParam(name="username", type=ParamType.STRING, required=True, description="Target player name"),
                CommandParam(name="value", type=ParamType.BOOLEAN, required=False, description="Enable or disable (-true/-false)"),
            ],
        ),
        RconCommandSchema(
            name="removeitem",
            description="Remove items from inventory",
            usage='removeitem "module.item" count',
            category=Cat.PLAYER_MGMT,
            parameters=[
                CommandParam(name="item", type=ParamType.STRING, required=True, description="Item ID (module.item format)"),
                CommandParam(name="count", type=ParamType.INTEGER, required=False, description="Number of items to remove"),
            ],
        ),
        RconCommandSchema(
            name="setaccesslevel",
            description="Set access level for a player",
            usage='setaccesslevel "username" "accesslevel"',
            category=Cat.PLAYER_MGMT,
            parameters=[
                CommandParam(name="username", type=ParamType.STRING, required=True, description="Target player name"),
                CommandParam(
                    name="accesslevel",
                    type=ParamType.ENUM,
                    required=True,
                    description="Access level to assign",
                    enum_values=["Admin", "Moderator", "Overseer", "GM", "Observer", "None"],
                ),
            ],
        ),
        RconCommandSchema(
            name="setpassword",
            description="Change a player's password",
            usage='setpassword "username" "newpassword"',
            category=Cat.PLAYER_MGMT,
            parameters=[
                CommandParam(name="username", type=ParamType.STRING, required=True, description="Target player name"),
                CommandParam(name="newpassword", type=ParamType.STRING, required=True, description="New password"),
            ],
        ),
        RconCommandSchema(
            name="teleport",
            description="Teleport yourself to a player",
            usage='teleport "playername"',
            category=Cat.PLAYER_MGMT,
            parameters=[
                CommandParam(name="playername", type=ParamType.STRING, required=True, description="Player to teleport to"),
            ],
        ),
        RconCommandSchema(
            name="teleportplayer",
            description="Teleport one player to another",
            usage='teleportplayer "player1" "player2"',
            category=Cat.PLAYER_MGMT,
            parameters=[
                CommandParam(name="player1", type=ParamType.STRING, required=True, description="Player to teleport"),
                CommandParam(name="player2", type=ParamType.STRING, required=True, description="Destination player"),
            ],
        ),
        RconCommandSchema(
            name="teleportto",
            description="Teleport to coordinates",
            usage="teleportto x,y,z",
            category=Cat.PLAYER_MGMT,
            parameters=[
                CommandParam(name="coordinates", type=ParamType.STRING, required=True, description="Coordinates (x,y,z)"),
            ],
        ),
        RconCommandSchema(
            name="players",
            description="List connected players",
            usage="players",
            category=Cat.PLAYER_MGMT,
            parameters=[],
        ),

        # ── MODERATION ────────────────────────────────────────────────
        RconCommandSchema(
            name="kick",
            description="Kick a user from the server",
            usage='kick "username" -r "reason"',
            category=Cat.MODERATION,
            parameters=[
                CommandParam(name="username", type=ParamType.STRING, required=True, description="Player to kick"),
                CommandParam(name="reason", type=ParamType.STRING, required=False, description="Kick reason"),
            ],
        ),
        RconCommandSchema(
            name="banid",
            description="Ban a SteamID",
            usage="banid SteamID",
            category=Cat.MODERATION,
            parameters=[
                CommandParam(name="steamid", type=ParamType.STRING, required=True, description="SteamID to ban"),
            ],
        ),
        RconCommandSchema(
            name="banip",
            description="Ban an IP address",
            usage="banip IP",
            category=Cat.MODERATION,
            parameters=[
                CommandParam(name="ip", type=ParamType.STRING, required=True, description="IP address to ban"),
            ],
        ),
        RconCommandSchema(
            name="banuser",
            description="Ban a user",
            usage='banuser "username" -ip -r "reason"',
            category=Cat.MODERATION,
            parameters=[
                CommandParam(name="username", type=ParamType.STRING, required=True, description="Player to ban"),
                CommandParam(name="ip", type=ParamType.BOOLEAN, required=False, description="Also ban IP address"),
                CommandParam(name="reason", type=ParamType.STRING, required=False, description="Ban reason"),
            ],
        ),
        RconCommandSchema(
            name="unbanid",
            description="Unban a SteamID",
            usage="unbanid SteamID",
            category=Cat.MODERATION,
            parameters=[
                CommandParam(name="steamid", type=ParamType.STRING, required=True, description="SteamID to unban"),
            ],
        ),
        RconCommandSchema(
            name="unbanip",
            description="Unban an IP address",
            usage="unbanip IP",
            category=Cat.MODERATION,
            parameters=[
                CommandParam(name="ip", type=ParamType.STRING, required=True, description="IP address to unban"),
            ],
        ),
        RconCommandSchema(
            name="unbanuser",
            description="Unban a user",
            usage='unbanuser "username"',
            category=Cat.MODERATION,
            parameters=[
                CommandParam(name="username", type=ParamType.STRING, required=True, description="Player to unban"),
            ],
        ),
        RconCommandSchema(
            name="voiceban",
            description="Toggle voice ban for a player",
            usage='voiceban "username" -value',
            category=Cat.MODERATION,
            parameters=[
                CommandParam(name="username", type=ParamType.STRING, required=True, description="Player to voice ban"),
                CommandParam(name="value", type=ParamType.BOOLEAN, required=False, description="Enable or disable (-true/-false)"),
            ],
        ),

        # ── WHITELIST ─────────────────────────────────────────────────
        RconCommandSchema(
            name="addsteamid",
            description="Add SteamID to whitelist",
            usage='addsteamid "steamid"',
            category=Cat.WHITELIST,
            parameters=[
                CommandParam(name="steamid", type=ParamType.STRING, required=True, description="SteamID to whitelist"),
            ],
        ),
        RconCommandSchema(
            name="removesteamid",
            description="Remove SteamID from whitelist",
            usage='removesteamid "steamid"',
            category=Cat.WHITELIST,
            parameters=[
                CommandParam(name="steamid", type=ParamType.STRING, required=True, description="SteamID to remove"),
            ],
        ),
        RconCommandSchema(
            name="adduser",
            description="Add user to whitelist",
            usage='adduser "username" "password"',
            category=Cat.WHITELIST,
            parameters=[
                CommandParam(name="username", type=ParamType.STRING, required=True, description="Username to add"),
                CommandParam(name="password", type=ParamType.STRING, required=True, description="Password for the user"),
            ],
        ),
        RconCommandSchema(
            name="removeuserfromwhitelist",
            description="Remove user from whitelist",
            usage='removeuserfromwhitelist "username"',
            category=Cat.WHITELIST,
            parameters=[
                CommandParam(name="username", type=ParamType.STRING, required=True, description="Username to remove"),
            ],
        ),

        # ── WORLD ─────────────────────────────────────────────────────
        RconCommandSchema(
            name="addvehicle",
            description="Spawn a vehicle",
            usage='addvehicle "script" "user or x,y,z"',
            category=Cat.WORLD,
            parameters=[
                CommandParam(name="script", type=ParamType.STRING, required=True, description="Vehicle script name"),
                CommandParam(name="location", type=ParamType.STRING, required=True, description="Player name or x,y,z coordinates"),
            ],
        ),
        RconCommandSchema(
            name="alarm",
            description="Sound a building alarm at current location",
            usage="alarm",
            category=Cat.WORLD,
            parameters=[],
        ),
        RconCommandSchema(
            name="chopper",
            description="Trigger helicopter event on a random player",
            usage="chopper",
            category=Cat.WORLD,
            parameters=[],
        ),
        RconCommandSchema(
            name="createhorde",
            description="Spawn a zombie horde near a player",
            usage='createhorde count "username"',
            category=Cat.WORLD,
            parameters=[
                CommandParam(name="count", type=ParamType.INTEGER, required=True, description="Number of zombies"),
                CommandParam(name="username", type=ParamType.STRING, required=True, description="Target player name"),
            ],
        ),
        RconCommandSchema(
            name="createhorde2",
            description="Alternative horde creation",
            usage="createhorde2",
            category=Cat.WORLD,
            parameters=[],
        ),
        RconCommandSchema(
            name="gunshot",
            description="Trigger gunshot sound on a random player",
            usage="gunshot",
            category=Cat.WORLD,
            parameters=[],
        ),
        RconCommandSchema(
            name="lightning",
            description="Strike lightning on a player",
            usage='lightning "username"',
            category=Cat.WORLD,
            parameters=[
                CommandParam(name="username", type=ParamType.STRING, required=True, description="Target player name"),
            ],
        ),
        RconCommandSchema(
            name="thunder",
            description="Strike thunder on a player",
            usage='thunder "username"',
            category=Cat.WORLD,
            parameters=[
                CommandParam(name="username", type=ParamType.STRING, required=True, description="Target player name"),
            ],
        ),
        RconCommandSchema(
            name="removezombies",
            description="Remove all zombies from the map",
            usage="removezombies",
            category=Cat.WORLD,
            parameters=[],
        ),
        RconCommandSchema(
            name="startrain",
            description="Start rain with given intensity",
            usage='startrain "intensity"',
            category=Cat.WORLD,
            parameters=[
                CommandParam(name="intensity", type=ParamType.INTEGER, required=True, description="Rain intensity (1-100)"),
            ],
        ),
        RconCommandSchema(
            name="startstorm",
            description="Start a storm for specified duration",
            usage='startstorm "duration"',
            category=Cat.WORLD,
            parameters=[
                CommandParam(name="duration", type=ParamType.INTEGER, required=True, description="Storm duration in game hours"),
            ],
        ),
        RconCommandSchema(
            name="stoprain",
            description="Stop current rain",
            usage="stoprain",
            category=Cat.WORLD,
            parameters=[],
        ),
        RconCommandSchema(
            name="stopweather",
            description="Stop all weather effects",
            usage="stopweather",
            category=Cat.WORLD,
            parameters=[],
        ),
        RconCommandSchema(
            name="setTimeSpeed",
            description="Set the server time multiplier",
            usage="setTimeSpeed period",
            category=Cat.WORLD,
            parameters=[
                CommandParam(name="period", type=ParamType.INTEGER, required=True, description="Time speed multiplier"),
            ],
        ),
        RconCommandSchema(
            name="worldgen",
            description="Control the world generator",
            usage="worldgen start|recheck|stop|status",
            category=Cat.WORLD,
            parameters=[
                CommandParam(
                    name="action",
                    type=ParamType.ENUM,
                    required=True,
                    description="World generator action",
                    enum_values=["start", "recheck", "stop", "status"],
                ),
            ],
        ),
        RconCommandSchema(
            name="addtosafehouse",
            description="Add player to safehouse",
            usage="addtosafehouse",
            category=Cat.WORLD,
            parameters=[],
        ),
        RconCommandSchema(
            name="kickfromsafehouse",
            description="Kick player from safehouse",
            usage="kickfromsafehouse",
            category=Cat.WORLD,
            parameters=[],
        ),
        RconCommandSchema(
            name="releasesafehouse",
            description="Release a safehouse",
            usage="releasesafehouse",
            category=Cat.WORLD,
            parameters=[],
        ),

        # ── SERVER ────────────────────────────────────────────────────
        RconCommandSchema(
            name="save",
            description="Save the world",
            usage="save",
            category=Cat.SERVER,
            parameters=[],
        ),
        RconCommandSchema(
            name="quit",
            description="Save and quit the server",
            usage="quit",
            category=Cat.SERVER,
            parameters=[],
        ),
        RconCommandSchema(
            name="servermsg",
            description="Broadcast a message to all players",
            usage='servermsg "message"',
            category=Cat.SERVER,
            parameters=[
                CommandParam(name="message", type=ParamType.STRING, required=True, description="Message to broadcast"),
            ],
        ),
        RconCommandSchema(
            name="changeoption",
            description="Change a server option at runtime",
            usage='changeoption optionName "newValue"',
            category=Cat.SERVER,
            parameters=[
                CommandParam(name="optionName", type=ParamType.STRING, required=True, description="Server option name"),
                CommandParam(name="newValue", type=ParamType.STRING, required=True, description="New value for the option"),
            ],
        ),
        RconCommandSchema(
            name="reloadoptions",
            description="Reload ServerOptions.ini from disk",
            usage="reloadoptions",
            category=Cat.SERVER,
            parameters=[],
        ),
        RconCommandSchema(
            name="showoptions",
            description="Show current server options",
            usage="showoptions",
            category=Cat.SERVER,
            parameters=[],
        ),
        RconCommandSchema(
            name="stats",
            description="Show server statistics",
            usage="stats",
            category=Cat.SERVER,
            parameters=[],
        ),
        RconCommandSchema(
            name="checkModsNeedUpdate",
            description="Check if any mods need updating",
            usage="checkModsNeedUpdate",
            category=Cat.SERVER,
            parameters=[],
        ),

        # ── ADMIN ─────────────────────────────────────────────────────
        RconCommandSchema(
            name="help",
            description="List available server commands",
            usage="help",
            category=Cat.ADMIN,
            parameters=[],
        ),
        RconCommandSchema(
            name="list",
            description="List (UI)",
            usage="list",
            category=Cat.ADMIN,
            parameters=[],
        ),
        RconCommandSchema(
            name="remove",
            description="Remove (UI)",
            usage="remove",
            category=Cat.ADMIN,
            parameters=[],
        ),

        # ── DEBUG ─────────────────────────────────────────────────────
        RconCommandSchema(
            name="log",
            description="Set log level",
            usage="log %1$s %2$s",
            category=Cat.DEBUG,
            parameters=[
                CommandParam(name="logger", type=ParamType.STRING, required=True, description="Logger name"),
                CommandParam(name="level", type=ParamType.STRING, required=True, description="Log level"),
            ],
        ),
        RconCommandSchema(
            name="reloadalllua",
            description="Reload all Lua scripts",
            usage='reloadalllua "filename"',
            category=Cat.DEBUG,
            parameters=[
                CommandParam(name="filename", type=ParamType.STRING, required=True, description="Lua filename to reload"),
            ],
        ),
        RconCommandSchema(
            name="reloadlua",
            description="Reload a single Lua script",
            usage='reloadlua "filename"',
            category=Cat.DEBUG,
            parameters=[
                CommandParam(name="filename", type=ParamType.STRING, required=True, description="Lua filename to reload"),
            ],
        ),
    ],
)


def register() -> None:
    """Register the Zomboid v1 schema in the global registry."""
    register_schema("zomboid", ZOMBOID_V1)
