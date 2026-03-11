# Garrison

RCON web dashboard for dedicated game servers. Currently supports **Project Zomboid** with a plugin architecture for adding more games.

## Features

- **Server Management** — Add, edit, and remove game servers with Fernet-encrypted RCON passwords
- **RCON Console** — Send commands via WebSocket with live output
- **Player List** — View connected players, kick, and ban
- **Server Status** — Online/offline polling with player counts
- **Chat Log** — View server chat messages
- **Scheduled Commands** — Cron-style automated RCON commands via APScheduler
- **Multi-game Plugins** — Abstract `GamePlugin` interface with Project Zomboid implementation

## Quick Start

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env — set SECRET_KEY and FERNET_KEY

# 2. Start everything
docker compose up --build

# 3. Open http://localhost
# First registered user becomes admin
```

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

## Stack

- **Backend:** FastAPI, SQLAlchemy (async), PostgreSQL, Alembic, APScheduler
- **Frontend:** React, TypeScript, Vite
- **Auth:** JWT + bcrypt
- **Deployment:** Docker Compose

## Adding a Game Plugin

1. Create `backend/app/games/yourgame.py` implementing `GamePlugin`
2. Register it in `backend/app/games/registry.py`
