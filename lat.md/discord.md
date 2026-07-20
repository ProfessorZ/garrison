# Discord Integration

Garrison integrates with Discord through three mechanisms: webhooks, a bot, and OAuth login.

## Webhooks

[[backend/app/models/server_webhook.py#ServerWebhook]] stores Discord webhook URLs per server. [[backend/app/services/discord_webhooks.py]] posts events (player joins, kills, chat messages, server status changes) to configured webhooks. Webhook destinations are managed through [[backend/app/api/webhooks.py]].

## Discord Bot

[[backend/app/services/discord_bot.py]] runs a discord.py bot that provides slash commands for server status, player lists, and RCON command execution directly from Discord. Requires `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID` configuration.

Each command is authorized via [[backend/app/services/discord_bot.py#_check_permission]]: if the invoking channel is mapped to a server (`discord_channel_id`), VIEWER-level commands are allowed for anyone in the channel, but MODERATOR+ commands additionally require the Discord member to hold an appropriate Discord permission (Manage Server, or Kick/Ban Members), checked by [[backend/app/services/discord_bot.py#_has_discord_permission]]. Otherwise, the command falls back to requiring a linked Garrison account with the minimum [[auth#Role Hierarchy]] role.

## OAuth Login

[[backend/app/api/auth.py]] supports Discord OAuth as an alternative login method, linking Discord accounts to Garrison [[auth#Role Hierarchy]] users.
