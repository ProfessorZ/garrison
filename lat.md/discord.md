# Discord Integration

Garrison integrates with Discord through three mechanisms: webhooks, a bot, and OAuth login.

## Webhooks

[[backend/app/models/server_webhook.py#ServerWebhook]] stores Discord webhook URLs per server. [[backend/app/services/discord_webhooks.py]] posts events (player joins, kills, chat messages, server status changes) to configured webhooks. Webhook destinations are managed through [[backend/app/api/webhooks.py]].

## Discord Bot

[[backend/app/services/discord_bot.py]] runs a discord.py bot that provides slash commands for server status, player lists, and RCON command execution directly from Discord. Requires `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID` configuration.

## OAuth Login

[[backend/app/api/auth.py]] supports Discord OAuth as an alternative login method, linking Discord accounts to Garrison [[auth#Role Hierarchy]] users.
