"""Project Zomboid RCON command schema v1.0.0 — covers build 41+ and unstable."""


def get_commands():
    """Return the list of CommandDef objects for Project Zomboid."""
    from app.plugins.base import CommandDef, CommandParam

    return [
        # ── PLAYER MANAGEMENT ─────────────────────────────────────────
        CommandDef(
            name="additem",
            description="Give item to player",
            category="PLAYER_MGMT",
            params=[
                CommandParam(name="username", type="string", description="Target player name"),
                CommandParam(name="item", type="string", description="Item ID (module.item format)"),
                CommandParam(name="count", type="integer", required=False, description="Number of items to give"),
            ],
            example='additem "username" "module.item" count',
        ),
        CommandDef(
            name="addkey",
            description="Give key to player",
            category="PLAYER_MGMT",
            params=[
                CommandParam(name="username", type="string", description="Target player name"),
                CommandParam(name="keyId", type="string", description="Key identifier"),
                CommandParam(name="name", type="string", description="Key display name"),
            ],
            example='addkey "username" "keyId" "name"',
        ),
        CommandDef(
            name="addxp",
            description="Give XP to player",
            category="PLAYER_MGMT",
            params=[
                CommandParam(name="playername", type="string", description="Target player name"),
                CommandParam(name="perkname", type="string", description="Perk name and XP amount (perkname=xp)"),
                CommandParam(name="announce", type="boolean", required=False, description="Announce XP gain (-true/-false)"),
            ],
            example='addxp "playername" perkname=xp -true',
        ),
        CommandDef(
            name="godmod",
            description="Toggle god mode for yourself",
            category="PLAYER_MGMT",
            params=[
                CommandParam(name="value", type="boolean", required=False, description="Enable or disable (-true/-false)"),
            ],
            example="godmod -value",
        ),
        CommandDef(
            name="godmodplayer",
            description="Toggle god mode for a player",
            category="PLAYER_MGMT",
            params=[
                CommandParam(name="username", type="string", description="Target player name"),
                CommandParam(name="value", type="boolean", required=False, description="Enable or disable (-true/-false)"),
            ],
            example='godmodplayer "username" -value',
        ),
        CommandDef(
            name="invisible",
            description="Toggle invisibility for yourself",
            category="PLAYER_MGMT",
            params=[
                CommandParam(name="value", type="boolean", required=False, description="Enable or disable (-true/-false)"),
            ],
            example="invisible -value",
        ),
        CommandDef(
            name="invisibleplayer",
            description="Toggle invisibility for a player",
            category="PLAYER_MGMT",
            params=[
                CommandParam(name="username", type="string", description="Target player name"),
                CommandParam(name="value", type="boolean", required=False, description="Enable or disable (-true/-false)"),
            ],
            example='invisibleplayer "username" -value',
        ),
        CommandDef(
            name="noclip",
            description="Toggle noclip for a player",
            category="PLAYER_MGMT",
            params=[
                CommandParam(name="username", type="string", description="Target player name"),
                CommandParam(name="value", type="boolean", required=False, description="Enable or disable (-true/-false)"),
            ],
            example='noclip "username" -value',
        ),
        CommandDef(
            name="removeitem",
            description="Remove items from inventory",
            category="PLAYER_MGMT",
            params=[
                CommandParam(name="item", type="string", description="Item ID (module.item format)"),
                CommandParam(name="count", type="integer", required=False, description="Number of items to remove"),
            ],
            example='removeitem "module.item" count',
        ),
        CommandDef(
            name="setaccesslevel",
            description="Set access level for a player",
            category="PLAYER_MGMT",
            params=[
                CommandParam(name="username", type="string", description="Target player name"),
                CommandParam(
                    name="accesslevel",
                    type="choice",
                    description="Access level to assign",
                    choices=["Admin", "Moderator", "Overseer", "GM", "Observer", "None"],
                ),
            ],
            example='setaccesslevel "username" "accesslevel"',
        ),
        CommandDef(
            name="setpassword",
            description="Change a player's password",
            category="PLAYER_MGMT",
            params=[
                CommandParam(name="username", type="string", description="Target player name"),
                CommandParam(name="newpassword", type="string", description="New password"),
            ],
            example='setpassword "username" "newpassword"',
        ),
        CommandDef(
            name="teleport",
            description="Teleport yourself to a player",
            category="PLAYER_MGMT",
            params=[
                CommandParam(name="playername", type="string", description="Player to teleport to"),
            ],
            example='teleport "playername"',
        ),
        CommandDef(
            name="teleportplayer",
            description="Teleport one player to another",
            category="PLAYER_MGMT",
            params=[
                CommandParam(name="player1", type="string", description="Player to teleport"),
                CommandParam(name="player2", type="string", description="Destination player"),
            ],
            example='teleportplayer "player1" "player2"',
        ),
        CommandDef(
            name="teleportto",
            description="Teleport to coordinates",
            category="PLAYER_MGMT",
            params=[
                CommandParam(name="coordinates", type="string", description="Coordinates (x,y,z)"),
            ],
            example="teleportto x,y,z",
        ),
        CommandDef(
            name="players",
            description="List connected players",
            category="PLAYER_MGMT",
            example="players",
        ),

        # ── MODERATION ────────────────────────────────────────────────
        CommandDef(
            name="kick",
            description="Kick a user from the server",
            category="MODERATION",
            params=[
                CommandParam(name="username", type="string", description="Player to kick"),
                CommandParam(name="reason", type="string", required=False, description="Kick reason"),
            ],
            example='kick "username" -r "reason"',
        ),
        CommandDef(
            name="banid",
            description="Ban a SteamID",
            category="MODERATION",
            params=[
                CommandParam(name="steamid", type="string", description="SteamID to ban"),
            ],
            example="banid SteamID",
        ),
        CommandDef(
            name="banip",
            description="Ban an IP address",
            category="MODERATION",
            params=[
                CommandParam(name="ip", type="string", description="IP address to ban"),
            ],
            example="banip IP",
        ),
        CommandDef(
            name="banuser",
            description="Ban a user",
            category="MODERATION",
            params=[
                CommandParam(name="username", type="string", description="Player to ban"),
                CommandParam(name="ip", type="boolean", required=False, description="Also ban IP address"),
                CommandParam(name="reason", type="string", required=False, description="Ban reason"),
            ],
            example='banuser "username" -ip -r "reason"',
        ),
        CommandDef(
            name="unbanid",
            description="Unban a SteamID",
            category="MODERATION",
            params=[
                CommandParam(name="steamid", type="string", description="SteamID to unban"),
            ],
            example="unbanid SteamID",
        ),
        CommandDef(
            name="unbanip",
            description="Unban an IP address",
            category="MODERATION",
            params=[
                CommandParam(name="ip", type="string", description="IP address to unban"),
            ],
            example="unbanip IP",
        ),
        CommandDef(
            name="unbanuser",
            description="Unban a user",
            category="MODERATION",
            params=[
                CommandParam(name="username", type="string", description="Player to unban"),
            ],
            example='unbanuser "username"',
        ),
        CommandDef(
            name="voiceban",
            description="Toggle voice ban for a player",
            category="MODERATION",
            params=[
                CommandParam(name="username", type="string", description="Player to voice ban"),
                CommandParam(name="value", type="boolean", required=False, description="Enable or disable (-true/-false)"),
            ],
            example='voiceban "username" -value',
        ),

        # ── WHITELIST ─────────────────────────────────────────────────
        CommandDef(
            name="addsteamid",
            description="Add SteamID to whitelist",
            category="WHITELIST",
            params=[
                CommandParam(name="steamid", type="string", description="SteamID to whitelist"),
            ],
            example='addsteamid "steamid"',
        ),
        CommandDef(
            name="removesteamid",
            description="Remove SteamID from whitelist",
            category="WHITELIST",
            params=[
                CommandParam(name="steamid", type="string", description="SteamID to remove"),
            ],
            example='removesteamid "steamid"',
        ),
        CommandDef(
            name="adduser",
            description="Add user to whitelist",
            category="WHITELIST",
            params=[
                CommandParam(name="username", type="string", description="Username to add"),
                CommandParam(name="password", type="string", description="Password for the user"),
            ],
            example='adduser "username" "password"',
        ),
        CommandDef(
            name="removeuserfromwhitelist",
            description="Remove user from whitelist",
            category="WHITELIST",
            params=[
                CommandParam(name="username", type="string", description="Username to remove"),
            ],
            example='removeuserfromwhitelist "username"',
        ),

        # ── WORLD ─────────────────────────────────────────────────────
        CommandDef(
            name="addvehicle",
            description="Spawn a vehicle",
            category="WORLD",
            params=[
                CommandParam(name="script", type="string", description="Vehicle script name"),
                CommandParam(name="location", type="string", description="Player name or x,y,z coordinates"),
            ],
            example='addvehicle "script" "user or x,y,z"',
        ),
        CommandDef(name="alarm", description="Sound a building alarm at current location", category="WORLD", example="alarm"),
        CommandDef(name="chopper", description="Trigger helicopter event on a random player", category="WORLD", example="chopper"),
        CommandDef(
            name="createhorde",
            description="Spawn a zombie horde near a player",
            category="WORLD",
            params=[
                CommandParam(name="count", type="integer", description="Number of zombies"),
                CommandParam(name="username", type="string", description="Target player name"),
            ],
            example='createhorde count "username"',
        ),
        CommandDef(name="createhorde2", description="Alternative horde creation", category="WORLD", example="createhorde2"),
        CommandDef(name="gunshot", description="Trigger gunshot sound on a random player", category="WORLD", example="gunshot"),
        CommandDef(
            name="lightning",
            description="Strike lightning on a player",
            category="WORLD",
            params=[CommandParam(name="username", type="string", description="Target player name")],
            example='lightning "username"',
        ),
        CommandDef(
            name="thunder",
            description="Strike thunder on a player",
            category="WORLD",
            params=[CommandParam(name="username", type="string", description="Target player name")],
            example='thunder "username"',
        ),
        CommandDef(name="removezombies", description="Remove all zombies from the map", category="WORLD", example="removezombies"),
        CommandDef(
            name="startrain",
            description="Start rain with given intensity",
            category="WORLD",
            params=[CommandParam(name="intensity", type="integer", description="Rain intensity (1-100)")],
            example='startrain "intensity"',
        ),
        CommandDef(
            name="startstorm",
            description="Start a storm for specified duration",
            category="WORLD",
            params=[CommandParam(name="duration", type="integer", description="Storm duration in game hours")],
            example='startstorm "duration"',
        ),
        CommandDef(name="stoprain", description="Stop current rain", category="WORLD", example="stoprain"),
        CommandDef(name="stopweather", description="Stop all weather effects", category="WORLD", example="stopweather"),
        CommandDef(
            name="setTimeSpeed",
            description="Set the server time multiplier",
            category="WORLD",
            params=[CommandParam(name="period", type="integer", description="Time speed multiplier")],
            example="setTimeSpeed period",
        ),
        CommandDef(
            name="worldgen",
            description="Control the world generator",
            category="WORLD",
            params=[
                CommandParam(name="action", type="choice", description="World generator action", choices=["start", "recheck", "stop", "status"]),
            ],
            example="worldgen start|recheck|stop|status",
        ),
        CommandDef(name="addtosafehouse", description="Add player to safehouse", category="WORLD", example="addtosafehouse"),
        CommandDef(name="kickfromsafehouse", description="Kick player from safehouse", category="WORLD", example="kickfromsafehouse"),
        CommandDef(name="releasesafehouse", description="Release a safehouse", category="WORLD", example="releasesafehouse"),

        # ── SERVER ────────────────────────────────────────────────────
        CommandDef(name="save", description="Save the world", category="SERVER", example="save"),
        CommandDef(name="quit", description="Save and quit the server", category="SERVER", example="quit"),
        CommandDef(
            name="servermsg",
            description="Broadcast a message to all players",
            category="SERVER",
            params=[CommandParam(name="message", type="string", description="Message to broadcast")],
            example='servermsg "message"',
        ),
        CommandDef(
            name="changeoption",
            description="Change a server option at runtime",
            category="SERVER",
            params=[
                CommandParam(name="optionName", type="string", description="Server option name"),
                CommandParam(name="newValue", type="string", description="New value for the option"),
            ],
            example='changeoption optionName "newValue"',
        ),
        CommandDef(name="reloadoptions", description="Reload ServerOptions.ini from disk", category="SERVER", example="reloadoptions"),
        CommandDef(name="showoptions", description="Show current server options", category="SERVER", example="showoptions"),
        CommandDef(name="stats", description="Show server statistics", category="SERVER", example="stats"),
        CommandDef(name="checkModsNeedUpdate", description="Check if any mods need updating", category="SERVER", example="checkModsNeedUpdate"),

        # ── ADMIN ─────────────────────────────────────────────────────
        CommandDef(name="help", description="List available server commands", category="ADMIN", example="help"),
        CommandDef(name="list", description="List (UI)", category="ADMIN", example="list"),
        CommandDef(name="remove", description="Remove (UI)", category="ADMIN", example="remove"),

        # ── DEBUG ─────────────────────────────────────────────────────
        CommandDef(
            name="log",
            description="Set log level",
            category="DEBUG",
            params=[
                CommandParam(name="logger", type="string", description="Logger name"),
                CommandParam(name="level", type="string", description="Log level"),
            ],
            example="log %1$s %2$s",
        ),
        CommandDef(
            name="reloadalllua",
            description="Reload all Lua scripts",
            category="DEBUG",
            params=[CommandParam(name="filename", type="string", description="Lua filename to reload")],
            example='reloadalllua "filename"',
        ),
        CommandDef(
            name="reloadlua",
            description="Reload a single Lua script",
            category="DEBUG",
            params=[CommandParam(name="filename", type="string", description="Lua filename to reload")],
            example='reloadlua "filename"',
        ),
    ]
