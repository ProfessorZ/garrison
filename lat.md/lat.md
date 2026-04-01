# Garrison

Garrison is an RCON web dashboard for managing dedicated game servers. It provides a unified interface to monitor and control multiple games through the [[rcon#RCON Protocol]], with a [[plugins#Plugin System]] for game-specific implementations.

## Stack

The application is a full-stack web app:
- **Backend**: Python 3.12, [[backend#FastAPI Backend]], SQLAlchemy async, PostgreSQL 16
- **Frontend**: React 19, TypeScript, Vite, [[frontend#React Frontend]]
- **Infrastructure**: Docker Compose, Nginx reverse proxy, Redis for job queuing

## Contents

The knowledge graph is organized into these interconnected spec files:

- [[backend]] — FastAPI REST API, database models, background worker, services
- [[frontend]] — React SPA with TanStack Query, Tailwind dark theme
- [[rcon]] — Source RCON protocol implementation and non-conformant server handling
- [[plugins]] — Game plugin architecture and lifecycle
- [[servers]] — Server CRUD, status polling, WebSocket console, metrics
- [[players]] — Player tracking, sessions, moderation, ban lists, Steam integration
- [[automation]] — Scheduled commands and event-driven triggers
- [[auth]] — JWT authentication, role hierarchy, per-server permissions
- [[discord]] — Webhooks, bot commands, OAuth login
- [[infrastructure]] — Docker Compose stack, Nginx proxy, build files
