# Plugin System

Garrison uses a plugin architecture to support multiple games. Each game (Rust, Zomboid, Factorio, HLL, DayZ, Minecraft, BeamMP, Arma Reforger) is an external plugin conforming to the GamePlugin interface.

Plugins are managed as git submodules in the `plugins/` directory, cloned via `git clone --recursive` or `git submodule update --init --recursive`.

## GamePlugin

The abstract base class [[backend/app/plugins/base.py#GamePlugin]] defines the interface every game plugin must implement:
- `parse_players(raw)` — parse RCON player list output into structured `PlayerInfo` objects
- `get_status(send_command)` — check if server is online
- `get_commands()` — return available RCON command definitions for the UI
- `kick_player` / `ban_player` — game-specific moderation commands
- `get_options` / `set_option` — server settings management
- `poll_events(send_command, since)` — fetch game events (kills, chat)

## Plugin Structure

Each plugin is a directory containing:
- `manifest.json` — metadata (id, name, version, default ports, garrison_api version, icon)
- `plugin.py` — `GamePlugin` subclass implementation
- `schema.py` — RCON command definitions and categories
- `options.py` — (optional) server option handling

Plugins are git submodules. Add new plugins with `git submodule add git@github.com:ProfessorZ/garrison-plugin-<game>.git plugins/garrison-plugin-<game>`.

## Plugin Lifecycle

[[backend/app/plugins/loader.py#PluginLoader]] scans the plugins directory for `manifest.json`, validates API version, installs pip requirements, dynamically imports `plugin.py`, and registers command schemas. Plugins can be installed at runtime via git clone or ZIP upload through [[backend/app/plugins/installer.py#PluginInstaller]].

## ConnectedPlugin Bridge

[[backend/app/plugins/bridge.py#ConnectedPlugin]] wraps a `GamePlugin` instance and provides it with an [[rcon#RconManager]] connection. This decouples plugins from RCON connection management — plugins just call `send_command(cmd)` and the bridge handles connection acquisition and release.

`broadcast` and `save_world` are delegated to the underlying plugin; callers should check `hasattr(connected_plugin.plugin, "broadcast")` (i.e. on the wrapped plugin, not the wrapper) to detect support before calling.
