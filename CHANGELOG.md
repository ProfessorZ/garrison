# Changelog

All notable changes to Garrison are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/)

## [Unreleased]

## [0.2.0] - 2026-03-21

### Added
- Steam A2S query port support for lightweight server status polling
- Game event system: kill feed, chat log, player activity tracking
- HLL-specific API endpoints: map rotation, server settings, player actions, VIP management, broadcast
- HLL frontend: Maps tab, Game Settings tab, HLL Players tab, broadcast banner
- Scheduled commands system with APScheduler
- Player database: KnownPlayer, PlayerSession, PlayerBan, PlayerNameHistory models
- Discord integration: bot slash commands, webhook notifications
- Server metrics collection and charting
- User role management (OWNER, ADMIN, MODERATOR, VIEWER)
- Per-server permissions
- RCON command autocomplete from plugin schemas
- Plugin marketplace: installable via git URL, hot-reload
- Full Playwright e2e test suite (24 functional + 12 visual regression tests)
- Changelog and semantic versioning

### Fixed
- HLL RCON protocol: correct JSON+XOR+binary-header TCP implementation
- HLL API: correct command names and content format for all RCON endpoints
- DayZ player regex: GUID (OK) suffix was preventing player detection
- Status endpoint: cached by default, no longer hammers RCON on every UI poll
- Double-login bug: AuthContext now fetches user immediately after token set
- Role dropdown z-index clipping in overflow containers
- Server permissions search: was incorrectly filtering out ADMIN users
- Plugin instance isolation: stateful plugins get fresh instance per caller
- CommandCategory enum: added MAP_MGMT, TIMERS, PLAYER_ACTIONS, etc.
- Factorio/HLL schema cross-contamination in RconConsole command autocomplete
- KillFeed.tsx: unused GameEvent import causing TypeScript build failure

### Changed
- Frontend polling intervals slowed to 60s (was 15s) to reduce server load
- ChatLog polling slowed to 30s (was 5s)

## [0.1.0] - 2026-03-11

### Added
- Initial release
- FastAPI backend with JWT auth (bcrypt)
- React/Vite/TypeScript frontend with Tailwind dark theme
- PostgreSQL + Alembic migrations
- Docker Compose stack (postgres, backend, frontend, nginx)
- Fernet-encrypted RCON passwords at rest
- Plugin architecture for games (base.py interface)
- Project Zomboid plugin (full command schema, player management)
- Factorio plugin
- Arma Reforger plugin (berconpy)
- DayZ plugin (berconpy BE RCON)
- Hell Let Loose plugin (custom JSON+XOR TCP protocol)
- WebSocket RCON console
- Player list with kick/ban
- Server status polling (APScheduler)
- Chat log polling
- Activity log
- Dashboard with stats
- Server detail tabs (Console, Players, Chat, Activity, Settings)
