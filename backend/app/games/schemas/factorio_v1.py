"""Factorio RCON command schema v1.0.0 — covers Factorio 1.1+ and 2.0+."""

from app.schemas.rcon_commands import (
    CommandCategory as Cat,
    CommandParam,
    GameCommandSchema,
    ParamType,
    RconCommandSchema,
    register_schema,
)

FACTORIO_V1 = GameCommandSchema(
    game_name="factorio",
    schema_version="1.0.0",
    min_game_version="1.1",
    max_game_version=None,
    commands=[
        # ── PLAYER MANAGEMENT ─────────────────────────────────────────
        RconCommandSchema(
            name="/players",
            description="List connected players",
            usage="/players",
            category=Cat.PLAYER_MGMT,
            parameters=[],
        ),
        RconCommandSchema(
            name="/players online",
            description="List online players with details",
            usage="/players online",
            category=Cat.PLAYER_MGMT,
            parameters=[],
        ),
        RconCommandSchema(
            name="/whisper",
            description="Send a private message to a player",
            usage="/whisper <player> <message>",
            category=Cat.PLAYER_MGMT,
            parameters=[
                CommandParam(name="player", type=ParamType.STRING, required=True, description="Target player name"),
                CommandParam(name="message", type=ParamType.STRING, required=True, description="Message to send"),
            ],
        ),
        RconCommandSchema(
            name="/ignore",
            description="Ignore a player's chat messages",
            usage="/ignore <player>",
            category=Cat.PLAYER_MGMT,
            parameters=[
                CommandParam(name="player", type=ParamType.STRING, required=True, description="Player to ignore"),
            ],
        ),

        # ── MODERATION ────────────────────────────────────────────────
        RconCommandSchema(
            name="/kick",
            description="Kick a player from the server",
            usage="/kick <player> <reason>",
            category=Cat.MODERATION,
            parameters=[
                CommandParam(name="player", type=ParamType.STRING, required=True, description="Player to kick"),
                CommandParam(name="reason", type=ParamType.STRING, required=False, description="Kick reason"),
            ],
        ),
        RconCommandSchema(
            name="/ban",
            description="Ban a player from the server",
            usage="/ban <player> <reason>",
            category=Cat.MODERATION,
            parameters=[
                CommandParam(name="player", type=ParamType.STRING, required=True, description="Player to ban"),
                CommandParam(name="reason", type=ParamType.STRING, required=False, description="Ban reason"),
            ],
        ),
        RconCommandSchema(
            name="/unban",
            description="Unban a player",
            usage="/unban <player>",
            category=Cat.MODERATION,
            parameters=[
                CommandParam(name="player", type=ParamType.STRING, required=True, description="Player to unban"),
            ],
        ),
        RconCommandSchema(
            name="/bans",
            description="List all banned players",
            usage="/bans",
            category=Cat.MODERATION,
            parameters=[],
        ),
        RconCommandSchema(
            name="/mute",
            description="Mute a player",
            usage="/mute <player>",
            category=Cat.MODERATION,
            parameters=[
                CommandParam(name="player", type=ParamType.STRING, required=True, description="Player to mute"),
            ],
        ),
        RconCommandSchema(
            name="/unmute",
            description="Unmute a player",
            usage="/unmute <player>",
            category=Cat.MODERATION,
            parameters=[
                CommandParam(name="player", type=ParamType.STRING, required=True, description="Player to unmute"),
            ],
        ),

        # ── ADMIN ─────────────────────────────────────────────────────
        RconCommandSchema(
            name="/promote",
            description="Promote a player to admin",
            usage="/promote <player>",
            category=Cat.ADMIN,
            parameters=[
                CommandParam(name="player", type=ParamType.STRING, required=True, description="Player to promote"),
            ],
        ),
        RconCommandSchema(
            name="/demote",
            description="Demote a player from admin",
            usage="/demote <player>",
            category=Cat.ADMIN,
            parameters=[
                CommandParam(name="player", type=ParamType.STRING, required=True, description="Player to demote"),
            ],
        ),
        RconCommandSchema(
            name="/admins",
            description="List server admins",
            usage="/admins",
            category=Cat.ADMIN,
            parameters=[],
        ),
        RconCommandSchema(
            name="/permissions",
            description="Manage permission groups",
            usage="/permissions",
            category=Cat.ADMIN,
            parameters=[],
        ),
        RconCommandSchema(
            name="/permissions add-player",
            description="Add a player to a permission group",
            usage="/permissions add-player <group> <player>",
            category=Cat.ADMIN,
            parameters=[
                CommandParam(name="group", type=ParamType.STRING, required=True, description="Permission group name"),
                CommandParam(name="player", type=ParamType.STRING, required=True, description="Player to add"),
            ],
        ),
        RconCommandSchema(
            name="/permissions create-group",
            description="Create a new permission group",
            usage="/permissions create-group <name>",
            category=Cat.ADMIN,
            parameters=[
                CommandParam(name="name", type=ParamType.STRING, required=True, description="Group name"),
            ],
        ),
        RconCommandSchema(
            name="/permissions get-player-group",
            description="Get a player's permission group",
            usage="/permissions get-player-group <player>",
            category=Cat.ADMIN,
            parameters=[
                CommandParam(name="player", type=ParamType.STRING, required=True, description="Player name"),
            ],
        ),

        # ── SERVER ────────────────────────────────────────────────────
        RconCommandSchema(
            name="/version",
            description="Print the game version",
            usage="/version",
            category=Cat.SERVER,
            parameters=[],
        ),
        RconCommandSchema(
            name="/time",
            description="Print the map age",
            usage="/time",
            category=Cat.SERVER,
            parameters=[],
        ),
        RconCommandSchema(
            name="/seed",
            description="Print the map seed",
            usage="/seed",
            category=Cat.SERVER,
            parameters=[],
        ),
        RconCommandSchema(
            name="/evolution",
            description="Print the evolution factor",
            usage="/evolution",
            category=Cat.SERVER,
            parameters=[],
        ),
        RconCommandSchema(
            name="/save",
            description="Save the game",
            usage="/save <name>",
            category=Cat.SERVER,
            parameters=[
                CommandParam(name="name", type=ParamType.STRING, required=False, description="Save file name"),
            ],
        ),
        RconCommandSchema(
            name="/help",
            description="List all available commands",
            usage="/help",
            category=Cat.SERVER,
            parameters=[],
        ),
        RconCommandSchema(
            name="/config get",
            description="Get a server configuration value",
            usage="/config get <option>",
            category=Cat.SERVER,
            parameters=[
                CommandParam(
                    name="option",
                    type=ParamType.ENUM,
                    required=True,
                    description="Configuration option name",
                    enum_values=[
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
                    ],
                ),
            ],
        ),
        RconCommandSchema(
            name="/config set",
            description="Set a server configuration value",
            usage="/config set <option> <value>",
            category=Cat.SERVER,
            parameters=[
                CommandParam(
                    name="option",
                    type=ParamType.ENUM,
                    required=True,
                    description="Configuration option name",
                    enum_values=[
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
                    ],
                ),
                CommandParam(name="value", type=ParamType.STRING, required=True, description="New value"),
            ],
        ),

        # ── WORLD ─────────────────────────────────────────────────────
        RconCommandSchema(
            name="/clear",
            description="Clear pollution or highlights",
            usage="/clear <what>",
            category=Cat.WORLD,
            parameters=[
                CommandParam(
                    name="what",
                    type=ParamType.ENUM,
                    required=True,
                    description="What to clear",
                    enum_values=["pollution", "highlights"],
                ),
            ],
        ),
        RconCommandSchema(
            name="/perf-avg-frames",
            description="Set the number of frames for performance averaging",
            usage="/perf-avg-frames <count>",
            category=Cat.WORLD,
            parameters=[
                CommandParam(name="count", type=ParamType.INTEGER, required=True, description="Number of frames"),
            ],
        ),

        # ── DEBUG ─────────────────────────────────────────────────────
        RconCommandSchema(
            name="/toggle-action-logging",
            description="Toggle logging of player actions",
            usage="/toggle-action-logging",
            category=Cat.DEBUG,
            parameters=[],
        ),
        RconCommandSchema(
            name="/toggle-heavy-mode",
            description="Toggle heavy mode",
            usage="/toggle-heavy-mode",
            category=Cat.DEBUG,
            parameters=[],
        ),
        RconCommandSchema(
            name="/measured-command",
            description="Run a command and measure execution time",
            usage="/measured-command <command>",
            category=Cat.DEBUG,
            parameters=[
                CommandParam(name="command", type=ParamType.STRING, required=True, description="Command to run"),
            ],
        ),
    ],
)


def register() -> None:
    """Register the Factorio v1 schema in the global registry."""
    register_schema("factorio", FACTORIO_V1)
