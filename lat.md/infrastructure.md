# Infrastructure

Garrison runs as a Docker Compose stack with five services orchestrated via `docker-compose.yml`.

## Docker Services

The stack includes PostgreSQL 16, Redis 7, the [[backend#FastAPI Backend]], an ARQ [[backend#Background Worker]], the [[frontend#React Frontend]] (built to static files and served by Nginx), and an Nginx reverse proxy.

The worker can be horizontally scaled via `docker compose up --scale worker=N` thanks to Redis-based distributed locks.

## Nginx Reverse Proxy

Nginx routes `/api/*` to the backend and `/*` to the frontend static files. It supports WebSocket upgrades for the live [[servers#WebSocket Console]] with long timeouts (86400s) for persistent connections. Docker's internal DNS resolver is used for container discovery.

## Build and Deploy

Three Dockerfiles handle the builds: Python 3.12-slim for backend and worker, multi-stage Node 22 → Nginx Alpine for the frontend. The `Makefile` provides convenience targets: `up`, `down`, `logs`, `migrate`, `shell`.
