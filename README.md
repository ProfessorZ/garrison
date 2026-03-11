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

## Adding a Game Plugin

1. Create `backend/app/games/yourgame.py` implementing `GamePlugin`
2. Register it in `backend/app/games/registry.py`

## Contributing

1. Fork the repo and create a feature branch
2. Make your changes with clear commit messages
3. Ensure the app builds cleanly (`make up`)
4. Open a pull request describing what changed and why
