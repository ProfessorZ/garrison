# Automation

Garrison provides two automation mechanisms: time-based scheduled commands and event-driven triggers.

## Scheduled Commands

[[backend/app/models/scheduled_command.py#ScheduledCommand]] stores cron expressions paired with RCON commands. The [[backend#Background Worker]] evaluates due commands every minute and sends them through the [[rcon#RCON Protocol]] connection.

The API supports preset schedules (e.g., hourly saves, restart warnings) and custom cron expressions.

## Triggers

[[backend/app/models/trigger.py#Trigger]] defines event→action rules. Supported trigger events include player join, player leave, chat message, server online, and server offline. Actions can be RCON commands, Discord webhook posts, player kicks, or bans.

[[backend/app/services/trigger_engine.py]] evaluates trigger conditions against incoming events and fires matching actions. Triggers are configured through [[backend/app/api/triggers.py]] and the frontend [[frontend/src/pages/TriggersPage.tsx]].
