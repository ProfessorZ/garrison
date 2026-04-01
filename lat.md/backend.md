# FastAPI Backend

The backend is a Python FastAPI application serving the REST API and WebSocket endpoints. It uses async/await throughout with SQLAlchemy async sessions and asyncpg for PostgreSQL.

## Application Startup

On startup ([[backend/app/main.py#lifespan]]), the app runs Alembic migrations, loads [[plugins#Plugin System]] from the plugins directory, and initializes services. The app is served by Uvicorn behind Nginx.

## API Layer

REST endpoints are organized as FastAPI routers in `backend/app/api/`. Key routers handle server CRUD, RCON console, player management, scheduling, triggers, and auth.

## Database Models

SQLAlchemy ORM models live in `backend/app/models/`. The schema is managed by Alembic migrations.

Core models:
- [[backend/app/models/server.py#Server]] — game server connection details (host, port, encrypted RCON password)
- [[backend/app/models/user.py#User]] — app users with global role
- [[backend/app/models/known_player.py#KnownPlayer]] — persistent player records with Steam data
- [[backend/app/models/player_session.py#PlayerSession]] — join/leave tracking per server
- [[backend/app/models/player_ban.py#PlayerBan]] — ban records with expiration
- [[backend/app/models/activity_log.py#ActivityLog]] — audit trail of admin actions
- [[backend/app/models/game_event.py#GameEvent]] — in-game events (kills, chat)

## Background Worker

The `backend/app/worker.py` process runs ARQ cron jobs with Redis-backed distributed locks ([[backend/app/worker_lock.py#with_lock]]) to support horizontal scaling. Jobs poll servers every minute for player status, chat, events, and execute scheduled commands.

## Services

Business logic services in `backend/app/services/`:
- [[backend/app/services/player_tracker.py#poll_players]] — polls player lists, manages sessions, enforces [[players#Ban Lists]]
- [[backend/app/services/trigger_engine.py#fire_event]] — evaluates [[automation#Triggers]] conditions and fires actions
- [[backend/app/services/discord_webhooks.py#notify_event]] — posts events to Discord channels
- [[backend/app/services/steam.py#get_vac_status]] — Steam API for VAC ban checks
