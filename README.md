# Garrison

RCON web dashboard for dedicated game servers. Modular plugin system supports **Project Zomboid**, **Factorio**, and any game with RCON.

## Features

- **Server Management** — Add, edit, and remove game servers with Fernet-encrypted RCON passwords
- **RCON Console** — Send commands via WebSocket with live output
- **Player List** — View connected players, kick, and ban
- **Server Status** — Online/offline polling with player counts
- **Server Options** — View and modify server settings per game
- **Chat Log** — View server chat messages
- **Scheduled Commands** — Cron-style automated RCON commands via APScheduler
- **Plugin System** — External, modular game plugins installable via git URL
- **Player Database** — Persistent player tracking, sessions, bans, and name history
- **Discord Integration** — Webhook notifications for server events + slash command bot

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/youruser/garrison.git
cd garrison

# 2. Copy and configure environment
cp .env.example .env
# Edit .env — set SECRET_KEY and FERNET_KEY

# 3. Start everything
make up

# 4. Open http://localhost
# First registered user becomes admin
```

## Make Targets

| Command        | Description                              |
|----------------|------------------------------------------|
| `make up`      | Build and start all services             |
| `make down`    | Stop and remove containers               |
| `make logs`    | Tail logs from all services              |
| `make migrate` | Run Alembic migrations in backend        |
| `make shell`   | Open a shell in the backend container    |

## Architecture

```
                  ┌──────────┐
  :80 ──────────► │  nginx   │
                  └────┬─────┘
                       │
            ┌──────────┼──────────┐
            │ /api/*   │ /*       │
            ▼          ▼          │
       ┌────────┐ ┌──────────┐   │
       │backend │ │ frontend │   │
       │FastAPI │ │React/Vite│   │
       └───┬────┘ └──────────┘   │
           │                     │
           ▼                     │
       ┌────────┐                │
       │  db    │                │
       │Postgres│                │
       └────────┘────────────────┘
```

- **nginx** — Reverse proxy, routes `/api/*` to backend and `/*` to frontend. WebSocket pass-through for RCON console.
- **backend** — FastAPI on uvicorn (port 8000). Handles auth, RCON, scheduling, and game plugin logic.
- **frontend** — React/TypeScript SPA built with Vite, served by nginx.
- **db** — PostgreSQL 16 with persistent volume.

## Tech Stack

- **Backend:** Python 3.12, FastAPI, SQLAlchemy (async), PostgreSQL, Alembic, APScheduler
- **Frontend:** React, TypeScript, Vite
- **Auth:** JWT + bcrypt, Fernet-encrypted RCON passwords
- **Infra:** Docker Compose, nginx reverse proxy

## Plugin System

Garrison uses a modular plugin architecture. Each game is an external plugin with its own directory.

### Plugin Directory

Plugins live in a configurable directory:
- **Docker:** `/data/plugins` (mounted from `./plugins`)
- **Local dev:** `./plugins` (relative to backend)
- **Custom:** Set `GARRISON_PLUGINS_DIR` env var

### Plugin Structure

```
plugins/
  garrison-plugin-zomboid/
    manifest.json       # Plugin metadata
    plugin.py           # GamePlugin subclass
    schema.py           # RCON command definitions
    options.py          # Server options handler
  garrison-plugin-factorio/
    manifest.json
    plugin.py
    schema.py
    options.py
  garrison-plugin-hll/
    manifest.json
    plugin.py
    schema.py
```

### manifest.json

```json
{
  "id": "zomboid",
  "name": "garrison-plugin-zomboid",
  "version": "1.0.0",
  "display_name": "Project Zomboid",
  "description": "RCON plugin for Project Zomboid dedicated servers",
  "author": "Garrison",
  "repo": "https://github.com/ProfessorZ/garrison-plugin-zomboid",
  "garrison_api": "1",
  "default_ports": { "game": 16261, "rcon": 27015 },
  "icon": "🧟"
}
```

### Installing Plugins

**Manual (recommended for development):**
```bash
cd plugins/
git clone https://github.com/ProfessorZ/garrison-plugin-zomboid.git
# Restart Garrison to load
```

**Via API (Owner only):**
```bash
curl -X POST /api/plugins/install \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"url": "https://github.com/ProfessorZ/garrison-plugin-zomboid.git"}'
```

**Plugin management endpoints:**
- `GET /api/plugins` — List installed plugins
- `POST /api/plugins/install` — Install from git URL (Owner)
- `DELETE /api/plugins/{id}` — Uninstall (Owner)
- `POST /api/plugins/{id}/update` — Update from repo (Owner)

### Writing a Plugin

Create a class that extends `GamePlugin` from `app.plugins.base`:

```python
from app.plugins.base import GamePlugin, PlayerInfo, ServerStatus, CommandDef, ServerOption

class MyGamePlugin(GamePlugin):
    @property
    def game_type(self) -> str:
        return "mygame"

    @property
    def display_name(self) -> str:
        return "My Game"

    async def parse_players(self, raw_response: str) -> list[PlayerInfo]:
        # Parse RCON player list output
        ...

    async def get_status(self, send_command) -> ServerStatus:
        # Check if server is online
        ...

    def get_commands(self) -> list[CommandDef]:
        # Return available RCON commands
        ...

    async def get_options(self, send_command) -> list[ServerOption]:
        # Fetch server configuration options
        ...

    async def set_option(self, send_command, name, value) -> str:
        # Modify a server option
        ...

    async def kick_player(self, send_command, name, reason="") -> str:
        ...

    async def ban_player(self, send_command, name, reason="") -> str:
        ...
```

## Discord Integration

Garrison supports two types of Discord integration:

### Webhook Notifications (No bot required)

Send server events to any Discord channel via webhooks.

1. In Discord, go to **Server Settings > Integrations > Webhooks**
2. Click **New Webhook**
3. Name it (e.g., "Garrison Alerts")
4. Choose the channel for notifications
5. Copy the **Webhook URL**
6. In Garrison, go to **Server Settings > Discord** tab
7. Paste the webhook URL and select which events to notify
8. Click **Test** to verify, then **Save**

**Supported events:** Server online/offline, player join/leave, player kick/ban, scheduled command execution, server errors.

### Discord Bot (Optional, for slash commands)

Control your servers directly from Discord.

#### Creating the Bot

1. Go to the Discord Developer Portal (https://discord.com/developers/applications)
2. Click **New Application**, name it "Garrison"
3. Go to **Bot** tab, click **Add Bot**
4. Under **Privileged Gateway Intents**, enable:
   - Server Members Intent
   - Message Content Intent
5. Click **Reset Token** and copy your bot token
6. Go to **OAuth2 > URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Embed Links`, `Use Slash Commands`
7. Copy the generated URL and open it to invite the bot to your server

#### Configuration

Add to your `.env` file:

```
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_discord_server_id
```

To find your Guild ID: Enable Developer Mode in Discord (Settings > Advanced), right-click your server > Copy Server ID.

#### Account Linking

The bot uses **Garrison roles** for permissions instead of Discord roles. Users must link their Discord account in Garrison.

**Method 1: OAuth2 (Recommended)**

Set up OAuth2 so users can link with one click:

1. In the [Discord Developer Portal](https://discord.com/developers/applications), open your Garrison application
2. Go to **OAuth2 > General**
3. Add a redirect URI: `http://your-domain/api/auth/discord/callback`
4. Copy the **Client ID** and **Client Secret**
5. Add to your `.env`:
   ```
   DISCORD_CLIENT_ID=your_client_id
   DISCORD_CLIENT_SECRET=your_client_secret
   DISCORD_REDIRECT_URI=http://your-domain/api/auth/discord/callback
   ```
6. Users click **"Link with Discord"** in Garrison settings — no manual ID copying needed

**Method 2: Manual ID (Fallback)**

If OAuth2 is not configured, users can link manually:

1. In Garrison, go to **Discord** page
2. Enter your Discord User ID (Enable Developer Mode, right-click your name, Copy User ID)
3. Click **Link**

Both methods are available when OAuth2 is configured. If `DISCORD_CLIENT_ID` is not set, only manual linking is shown.

Once linked, your Garrison role (OWNER, ADMIN, MODERATOR, VIEWER) determines which bot commands you can use.

#### Available Commands

| Command | Description | Required Garrison Role |
|---------|-------------|----------------------|
| `/status` | Show all servers | None (public) |
| `/servers` | List configured servers | None (public) |
| `/players <server>` | List online players | VIEWER+ (linked account) |
| `/kick <server> <player> [reason]` | Kick a player | MODERATOR+ |
| `/ban <server> <player> [reason]` | Ban a player | ADMIN+ |
| `/rcon <server> <command>` | Execute RCON command | ADMIN+ |

All bot actions from linked accounts are logged to the Garrison activity log.

## Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

## Contributing

1. Fork the repo and create a feature branch
2. Make your changes with clear commit messages
3. Ensure the app builds cleanly (`make up`)
4. Open a pull request describing what changed and why
