"""Factorio RCON command schema v1.0.0 — covers Factorio 1.1+ and 2.0+."""


def get_commands():
    """Return the list of CommandDef objects for Factorio."""
    from app.plugins.base import CommandDef, CommandParam

    return [
        # ── PLAYER MANAGEMENT ─────────────────────────────────────────
        CommandDef(name="/players", description="List connected players", category="PLAYER_MGMT", example="/players"),
        CommandDef(name="/players online", description="List online players with details", category="PLAYER_MGMT", example="/players online"),
        CommandDef(
            name="/whisper",
            description="Send a private message to a player",
            category="PLAYER_MGMT",
            params=[
                CommandParam(name="player", type="string", description="Target player name"),
                CommandParam(name="message", type="string", description="Message to send"),
            ],
            example="/whisper <player> <message>",
        ),
        CommandDef(
            name="/ignore",
            description="Ignore a player's chat messages",
            category="PLAYER_MGMT",
            params=[CommandParam(name="player", type="string", description="Player to ignore")],
            example="/ignore <player>",
        ),

        # ── MODERATION ────────────────────────────────────────────────
        CommandDef(
            name="/kick",
            description="Kick a player from the server",
            category="MODERATION",
            params=[
                CommandParam(name="player", type="string", description="Player to kick"),
                CommandParam(name="reason", type="string", required=False, description="Kick reason"),
            ],
            example="/kick <player> <reason>",
        ),
        CommandDef(
            name="/ban",
            description="Ban a player from the server",
            category="MODERATION",
            params=[
                CommandParam(name="player", type="string", description="Player to ban"),
                CommandParam(name="reason", type="string", required=False, description="Ban reason"),
            ],
            example="/ban <player> <reason>",
        ),
        CommandDef(
            name="/unban",
            description="Unban a player",
            category="MODERATION",
            params=[CommandParam(name="player", type="string", description="Player to unban")],
            example="/unban <player>",
        ),
        CommandDef(name="/bans", description="List all banned players", category="MODERATION", example="/bans"),
        CommandDef(
            name="/mute",
            description="Mute a player",
            category="MODERATION",
            params=[CommandParam(name="player", type="string", description="Player to mute")],
            example="/mute <player>",
        ),
        CommandDef(
            name="/unmute",
            description="Unmute a player",
            category="MODERATION",
            params=[CommandParam(name="player", type="string", description="Player to unmute")],
            example="/unmute <player>",
        ),

        # ── ADMIN ─────────────────────────────────────────────────────
        CommandDef(
            name="/promote",
            description="Promote a player to admin",
            category="ADMIN",
            params=[CommandParam(name="player", type="string", description="Player to promote")],
            example="/promote <player>",
        ),
        CommandDef(
            name="/demote",
            description="Demote a player from admin",
            category="ADMIN",
            params=[CommandParam(name="player", type="string", description="Player to demote")],
            example="/demote <player>",
        ),
        CommandDef(name="/admins", description="List server admins", category="ADMIN", example="/admins"),
        CommandDef(name="/permissions", description="Manage permission groups", category="ADMIN", example="/permissions"),
        CommandDef(
            name="/permissions add-player",
            description="Add a player to a permission group",
            category="ADMIN",
            params=[
                CommandParam(name="group", type="string", description="Permission group name"),
                CommandParam(name="player", type="string", description="Player to add"),
            ],
            example="/permissions add-player <group> <player>",
        ),
        CommandDef(
            name="/permissions create-group",
            description="Create a new permission group",
            category="ADMIN",
            params=[CommandParam(name="name", type="string", description="Group name")],
            example="/permissions create-group <name>",
        ),
        CommandDef(
            name="/permissions get-player-group",
            description="Get a player's permission group",
            category="ADMIN",
            params=[CommandParam(name="player", type="string", description="Player name")],
            example="/permissions get-player-group <player>",
        ),

        # ── SERVER ────────────────────────────────────────────────────
        CommandDef(name="/version", description="Print the game version", category="SERVER", example="/version"),
        CommandDef(name="/time", description="Print the map age", category="SERVER", example="/time"),
        CommandDef(name="/seed", description="Print the map seed", category="SERVER", example="/seed"),
        CommandDef(name="/evolution", description="Print the evolution factor", category="SERVER", example="/evolution"),
        CommandDef(
            name="/save",
            description="Save the game",
            category="SERVER",
            params=[CommandParam(name="name", type="string", required=False, description="Save file name")],
            example="/save <name>",
        ),
        CommandDef(name="/help", description="List all available commands", category="SERVER", example="/help"),
        CommandDef(
            name="/config get",
            description="Get a server configuration value",
            category="SERVER",
            params=[
                CommandParam(
                    name="option",
                    type="choice",
                    description="Configuration option name",
                    choices=[
                        "afk-auto-kick", "allow-commands", "autosave-interval",
                        "max-players", "max-upload-slots", "max-upload-in-kilobytes-per-second",
                        "name", "description", "tags", "password",
                        "visibility-lan", "visibility-public",
                        "require-user-verification", "only-admins-can-pause-the-game",
                    ],
                ),
            ],
            example="/config get <option>",
        ),
        CommandDef(
            name="/config set",
            description="Set a server configuration value",
            category="SERVER",
            params=[
                CommandParam(
                    name="option",
                    type="choice",
                    description="Configuration option name",
                    choices=[
                        "afk-auto-kick", "allow-commands", "autosave-interval",
                        "max-players", "max-upload-slots", "max-upload-in-kilobytes-per-second",
                        "name", "description", "tags", "password",
                        "visibility-lan", "visibility-public",
                        "require-user-verification", "only-admins-can-pause-the-game",
                    ],
                ),
                CommandParam(name="value", type="string", description="New value"),
            ],
            example="/config set <option> <value>",
        ),

        # ── WORLD ─────────────────────────────────────────────────────
        CommandDef(
            name="/clear",
            description="Clear pollution or highlights",
            category="WORLD",
            params=[CommandParam(name="what", type="choice", description="What to clear", choices=["pollution", "highlights"])],
            example="/clear <what>",
        ),
        CommandDef(
            name="/perf-avg-frames",
            description="Set the number of frames for performance averaging",
            category="WORLD",
            params=[CommandParam(name="count", type="integer", description="Number of frames")],
            example="/perf-avg-frames <count>",
        ),

        # ── DEBUG ─────────────────────────────────────────────────────
        CommandDef(name="/toggle-action-logging", description="Toggle logging of player actions", category="DEBUG", example="/toggle-action-logging"),
        CommandDef(name="/toggle-heavy-mode", description="Toggle heavy mode", category="DEBUG", example="/toggle-heavy-mode"),
        CommandDef(
            name="/measured-command",
            description="Run a command and measure execution time",
            category="DEBUG",
            params=[CommandParam(name="command", type="string", description="Command to run")],
            example="/measured-command <command>",
        ),
    ]
