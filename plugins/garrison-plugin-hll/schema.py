"""Hell Let Loose RCON command schema v1.0.0."""


def get_commands():
    """Return the list of CommandDef objects for Hell Let Loose."""
    from app.plugins.base import CommandDef, CommandParam

    return [
        # ── PLAYER MANAGEMENT ─────────────────────────────────────────
        CommandDef(name="GetPlayers", description="List connected players", category="PLAYER_MGMT", example="GetPlayers"),
        CommandDef(
            name="MessagePlayer",
            description="Send a private message to a player",
            category="PLAYER_MGMT",
            params=[
                CommandParam(name="player_id", type="string", description="Player ID or name"),
                CommandParam(name="message", type="string", description="Message to send"),
            ],
            example='MessagePlayer <player_id> "message"',
        ),
        CommandDef(
            name="MessageAllPlayers",
            description="Broadcast a message to all players",
            category="PLAYER_MGMT",
            params=[CommandParam(name="message", type="string", description="Message text")],
            example='MessageAllPlayers "Server restart soon"',
        ),

        # ── MODERATION ────────────────────────────────────────────────
        CommandDef(
            name="KickPlayer",
            description="Kick a player by ID",
            category="MODERATION",
            params=[
                CommandParam(name="player_id", type="string", description="Player ID or name"),
                CommandParam(name="reason", type="string", required=False, description="Kick reason"),
            ],
            example='KickPlayer <player_id> "reason"',
        ),
        CommandDef(
            name="TemporaryBanPlayer",
            description="Temporarily ban a player (hours)",
            category="MODERATION",
            params=[
                CommandParam(name="player_id", type="string", description="Player ID or name"),
                CommandParam(name="hours", type="integer", description="Ban duration (hours)"),
                CommandParam(name="reason", type="string", required=False, description="Ban reason"),
            ],
            example='TemporaryBanPlayer <player_id> 2 "teamkilling"',
        ),
        CommandDef(
            name="PermanentBanPlayer",
            description="Permanently ban a player",
            category="MODERATION",
            params=[
                CommandParam(name="player_id", type="string", description="Player ID or name"),
                CommandParam(name="reason", type="string", required=False, description="Ban reason"),
            ],
            example='PermanentBanPlayer <player_id> "cheating"',
        ),
        CommandDef(
            name="RemoveTemporaryBan",
            description="Remove a temporary ban by player ID",
            category="MODERATION",
            params=[CommandParam(name="player_id", type="string", description="Player ID")],
            example="RemoveTemporaryBan <player_id>",
        ),
        CommandDef(
            name="RemovePermanentBan",
            description="Remove a permanent ban by player ID",
            category="MODERATION",
            params=[CommandParam(name="player_id", type="string", description="Player ID")],
            example="RemovePermanentBan <player_id>",
        ),
        CommandDef(name="GetTemporaryBans", description="List active temporary bans", category="MODERATION", example="GetTemporaryBans"),
        CommandDef(name="GetPermanentBans", description="List active permanent bans", category="MODERATION", example="GetPermanentBans"),

        # ── ADMIN / VIP ───────────────────────────────────────────────
        CommandDef(
            name="AddVip",
            description="Add a VIP by player ID",
            category="ADMIN",
            params=[
                CommandParam(name="player_id", type="string", description="Player ID"),
                CommandParam(name="name", type="string", required=False, description="Display name"),
            ],
            example='AddVip <player_id> "Name"',
        ),
        CommandDef(
            name="RemoveVip",
            description="Remove a VIP by player ID",
            category="ADMIN",
            params=[CommandParam(name="player_id", type="string", description="Player ID")],
            example="RemoveVip <player_id>",
        ),

        # ── SERVER ────────────────────────────────────────────────────
        CommandDef(name="GetServerInformation", description="Get current server session info", category="SERVER", example="GetServerInformation"),
        CommandDef(
            name="ServerBroadcast",
            description="Broadcast a message to the server",
            category="SERVER",
            params=[CommandParam(name="message", type="string", description="Message text")],
            example='ServerBroadcast "Server restarting soon"',
        ),
        CommandDef(
            name="SetIdleKickDuration",
            description="Set idle kick timeout (minutes)",
            category="SERVER",
            params=[CommandParam(name="minutes", type="integer", description="Minutes before kick (0 to disable)")],
            example="SetIdleKickDuration 15",
        ),
        CommandDef(
            name="SetHighPingThreshold",
            description="Set ping threshold (ms) for auto-kick",
            category="SERVER",
            params=[CommandParam(name="threshold", type="integer", description="Ping in ms")],
            example="SetHighPingThreshold 250",
        ),
        CommandDef(
            name="SetAutoBalanceEnabled",
            description="Enable or disable auto balance",
            category="SERVER",
            params=[CommandParam(name="enabled", type="boolean", description="true/false")],
            example="SetAutoBalanceEnabled true",
        ),
        CommandDef(
            name="SetAutoBalanceThreshold",
            description="Set team size delta to trigger auto balance",
            category="SERVER",
            params=[CommandParam(name="threshold", type="integer", description="Player count difference")],
            example="SetAutoBalanceThreshold 2",
        ),
        CommandDef(
            name="SetVoteKickEnabled",
            description="Enable or disable vote kicking",
            category="SERVER",
            params=[CommandParam(name="enabled", type="boolean", description="true/false")],
            example="SetVoteKickEnabled true",
        ),
        CommandDef(
            name="SetWelcomeMessage",
            description="Set the server welcome message",
            category="SERVER",
            params=[CommandParam(name="message", type="string", description="Welcome text")],
            example='SetWelcomeMessage "Welcome to the server!"',
        ),
    ]
