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

## Architecture

The application uses a layered architecture with FastAPI as the REST API layer, SQLAlchemy async for database operations, and ARQ for background job processing. The frontend communicates via REST endpoints and WebSockets for real-time console output.

## RCON Management

RCON connections are managed through an async connection pool that maintains persistent connections per server. The [[rcon#RconManager]] handles connection lifecycle, auto-reconnect, and command queuing.

## Plugin System

The [[plugins#Plugin System]] provides game-specific implementations through a structured plugin architecture. Each game type has a dedicated plugin that handles RCON command mapping and game events.

## Discord Integration

The [[discord#Discord Integration]] module provides bidirectional communication with Discord via webhooks for notifications and bot commands for admin actions.

## Background Services (ARQ Worker)

Background job processing is handled by ARQ workers that process queued commands, scheduled automation tasks, and async analytics.

## Authentication & Authorization

JWT-based authentication with role-based access control. See [[auth#Authentication and Authorization]] for detailed permissions and token management.

## Analytics

The analytics module derives game statistics from the game_events table, aggregating metrics like player counts, session durations, and server activity over time.
