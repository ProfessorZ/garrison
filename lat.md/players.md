# Player Management

Garrison maintains a persistent player database that tracks players across servers and sessions.

## Known Players

[[backend/app/models/known_player.py#KnownPlayer]] is the canonical player record, storing Steam ID, names, playtime totals, and Steam profile data. Players are auto-created when first seen by the [[backend/app/services/player_tracker.py]] polling loop. Name changes are tracked in [[backend/app/models/player_name.py#PlayerNameHistory]] history.

## Player Sessions

[[backend/app/models/player_session.py#PlayerSession]] records each join/leave event per server. The player tracker polls the server's player list every minute via the [[plugins#GamePlugin]] `parse_players` method and reconciles joins and leaves.

## Moderation

Players can be kicked or banned through the API ([[backend/app/api/players.py]]). Bans are recorded as [[backend/app/models/player_ban.py#PlayerBan]] with optional expiration for temp bans. Admins can add notes ([[backend/app/models/player_note.py#PlayerNote]]) to player profiles.

## Ban Lists

[[backend/app/models/ban_list.py#BanList]] supports both global and per-server ban lists. Lists can be linked to multiple servers for enforcement. [[backend/app/services/ban_list_service.py]] checks incoming players against active ban lists and auto-kicks matches. [[backend/app/models/ban_template.py#BanTemplate]] provides reusable ban reasons.

## Steam Integration

[[backend/app/services/steam.py]] enriches player profiles with Steam API data and checks for VAC/game bans. [[backend/app/services/heuristics.py]] provides detection heuristics for suspicious accounts.
