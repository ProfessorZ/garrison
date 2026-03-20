"""Factorio RCON command schema v1.1.0 — full Factorio 2.0 command list."""


def get_commands():
    """Return the list of CommandDef objects for Factorio 2.0."""
    from app.plugins.base import CommandDef, CommandParam

    return [
        # ── PLAYER MANAGEMENT ─────────────────────────────────────────
        CommandDef(name="/players", description="List connected players", category="PLAYER_MGMT", example="/players"),
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
            name="/shout",
            description="Send a message to all players on the server",
            category="PLAYER_MGMT",
            params=[CommandParam(name="message", type="string", description="Message to shout")],
            example="/shout <message>",
        ),
        CommandDef(
            name="/reply",
            description="Reply to the last whisper received",
            category="PLAYER_MGMT",
            params=[CommandParam(name="message", type="string", description="Reply message")],
            example="/reply <message>",
        ),
        CommandDef(
            name="/color",
            description="Change your player color",
            category="PLAYER_MGMT",
            params=[
                CommandParam(name="r", type="float", description="Red (0-1)"),
                CommandParam(name="g", type="float", description="Green (0-1)"),
                CommandParam(name="b", type="float", description="Blue (0-1)"),
                CommandParam(name="a", type="float", required=False, description="Alpha (0-1)"),
            ],
            example="/color <r> <g> <b> [a]",
        ),
        CommandDef(
            name="/ignore",
            description="Ignore a player's chat messages",
            category="PLAYER_MGMT",
            params=[CommandParam(name="player", type="string", description="Player to ignore")],
            example="/ignore <player>",
        ),
        CommandDef(
            name="/unignore",
            description="Stop ignoring a player's chat messages",
            category="PLAYER_MGMT",
            params=[CommandParam(name="player", type="string", description="Player to unignore")],
            example="/unignore <player>",
        ),
        CommandDef(name="/ignores", description="List all ignored players", category="PLAYER_MGMT", example="/ignores"),

        # ── MODERATION ────────────────────────────────────────────────
        CommandDef(
            name="/kick",
            description="Kick a player from the server",
            category="MODERATION",
            params=[
                CommandParam(name="player", type="string", description="Player to kick"),
                CommandParam(name="reason", type="string", required=False, description="Kick reason"),
            ],
            example="/kick <player> [reason]",
        ),
        CommandDef(
            name="/ban",
            description="Ban a player from the server",
            category="MODERATION",
            params=[
                CommandParam(name="player", type="string", description="Player to ban"),
                CommandParam(name="reason", type="string", required=False, description="Ban reason"),
            ],
            example="/ban <player> [reason]",
        ),
        CommandDef(name="/bans", description="List all banned players", category="MODERATION", example="/bans"),
        CommandDef(
            name="/unban",
            description="Unban a player",
            category="MODERATION",
            params=[CommandParam(name="player", type="string", description="Player to unban")],
            example="/unban <player>",
        ),
        CommandDef(name="/banlist", description="Print the banlist", category="MODERATION", example="/banlist"),
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
        CommandDef(name="/mutes", description="List all muted players", category="MODERATION", example="/mutes"),
        CommandDef(
            name="/whitelist",
            description="Manage the server whitelist",
            category="MODERATION",
            params=[
                CommandParam(name="action", type="choice", description="Whitelist action",
                             choices=["add", "remove", "get", "clear"]),
                CommandParam(name="player", type="string", required=False, description="Player name (for add/remove)"),
            ],
            example="/whitelist <action> [player]",
        ),
        CommandDef(
            name="/purge",
            description="Purge all chat messages from a player",
            category="MODERATION",
            params=[CommandParam(name="player", type="string", description="Player whose messages to purge")],
            example="/purge <player>",
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
            name="/admin",
            description="Open the admin panel or toggle admin status",
            category="ADMIN",
            example="/admin",
        ),
        CommandDef(
            name="/swap-players",
            description="Swap two players' characters",
            category="ADMIN",
            params=[
                CommandParam(name="player1", type="string", description="First player"),
                CommandParam(name="player2", type="string", description="Second player"),
            ],
            example="/swap-players <player1> <player2>",
        ),
        CommandDef(
            name="/delete-blueprint-library",
            description="Delete a player's blueprint library",
            category="ADMIN",
            params=[CommandParam(name="player", type="string", description="Player whose library to delete")],
            example="/delete-blueprint-library <player>",
        ),

        # ── SERVER ────────────────────────────────────────────────────
        CommandDef(name="/help", description="List all available commands", category="SERVER", example="/help"),
        CommandDef(name="/version", description="Print the game version", category="SERVER", example="/version"),
        CommandDef(name="/time", description="Print the map age", category="SERVER", example="/time"),
        CommandDef(name="/seed", description="Print the map seed", category="SERVER", example="/seed"),
        CommandDef(
            name="/config",
            description="Get or set a server configuration value",
            category="SERVER",
            params=[
                CommandParam(name="action", type="choice", description="Action", choices=["get", "set"]),
                CommandParam(name="option", type="string", description="Configuration option name"),
                CommandParam(name="value", type="string", required=False, description="New value (for set)"),
            ],
            example="/config <get|set> <option> [value]",
        ),
        CommandDef(
            name="/server-save",
            description="Force the server to save the game",
            category="SERVER",
            example="/server-save",
        ),
        CommandDef(name="/alerts", description="Show current alerts", category="SERVER", example="/alerts"),
        CommandDef(
            name="/open",
            description="Open another player's inventory",
            category="SERVER",
            params=[CommandParam(name="player", type="string", description="Player whose inventory to open")],
            example="/open <player>",
        ),

        # ── WORLD ─────────────────────────────────────────────────────
        CommandDef(
            name="/command",
            description="Run a Lua command on the server",
            category="WORLD",
            params=[CommandParam(name="lua", type="string", description="Lua code to execute")],
            example="/command <lua>",
        ),
        CommandDef(
            name="/measured-command",
            description="Run a Lua command and measure execution time",
            category="WORLD",
            params=[CommandParam(name="lua", type="string", description="Lua code to execute")],
            example="/measured-command <lua>",
        ),
        CommandDef(
            name="/silent-command",
            description="Run a Lua command without printing output",
            category="WORLD",
            params=[CommandParam(name="lua", type="string", description="Lua code to execute")],
            example="/silent-command <lua>",
        ),
        CommandDef(name="/evolution", description="Print the evolution factor", category="WORLD", example="/evolution"),
        CommandDef(
            name="/screenshot",
            description="Take a screenshot of the game",
            category="WORLD",
            params=[
                CommandParam(name="resolution", type="string", required=False, description="Screenshot resolution (WxH)"),
                CommandParam(name="zoom", type="float", required=False, description="Zoom level"),
            ],
            example="/screenshot [resolution] [zoom]",
        ),
        CommandDef(
            name="/clear",
            description="Clear the console log",
            category="WORLD",
            example="/clear",
        ),
        CommandDef(
            name="/mute-programmable-speaker",
            description="Mute or unmute all programmable speakers",
            category="WORLD",
            example="/mute-programmable-speaker",
        ),
        CommandDef(
            name="/space-platform-delete-time",
            description="Set or get the delete time for space platforms with no players",
            category="WORLD",
            params=[CommandParam(name="minutes", type="integer", required=False, description="Time in minutes (omit to get current)")],
            example="/space-platform-delete-time [minutes]",
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
        CommandDef(name="/toggle-heavy-mode", description="Toggle heavy mode for testing performance", category="DEBUG", example="/toggle-heavy-mode"),
        CommandDef(name="/editor", description="Toggle the map editor", category="DEBUG", example="/editor"),
        CommandDef(
            name="/cheat",
            description="Toggle cheat mode or run a cheat subcommand",
            category="DEBUG",
            params=[CommandParam(name="subcommand", type="string", required=False, description="Cheat subcommand")],
            example="/cheat [subcommand]",
        ),
        CommandDef(name="/unlock-shortcut-bar", description="Unlock all shortcut bar items", category="DEBUG", example="/unlock-shortcut-bar"),
        CommandDef(name="/unlock-tips", description="Unlock all tips and tricks", category="DEBUG", example="/unlock-tips"),
        CommandDef(name="/reset-tips", description="Reset all tips and tricks to unread", category="DEBUG", example="/reset-tips"),
        CommandDef(
            name="/large-blueprint-size",
            description="Set the large blueprint size threshold",
            category="DEBUG",
            params=[CommandParam(name="size", type="integer", required=False, description="Size threshold")],
            example="/large-blueprint-size [size]",
        ),
    ]
