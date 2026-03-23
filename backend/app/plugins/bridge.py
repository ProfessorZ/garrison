"""Bridge between new GamePlugin API and existing core RCON infrastructure.

The new plugin API is stateless — plugins receive a `send_command` callable
instead of managing their own connections. This module provides helpers to
create connected plugin contexts that the existing API routes can use with
minimal changes.
"""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from app.plugins.base import GamePlugin
from app.plugins.loader import PluginLoader
from app.rcon.manager import rcon_manager

logger = logging.getLogger(__name__)


class ConnectedPlugin:
    """Wraps a GamePlugin with an active RCON connection, providing
    a similar interface to the old GamePlugin class for easy migration.
    """

    def __init__(self, plugin: GamePlugin, server_id: int):
        self.plugin = plugin
        self.server_id = server_id

    @property
    def _uses_custom(self) -> bool:
        return getattr(self.plugin, "custom_connection", False)

    async def send_command(self, command: str, content: str = "") -> str:
        """Send a command, routing through the plugin's custom protocol or
        the shared RCON manager depending on the plugin type."""
        if self._uses_custom:
            try:
                return await self.plugin.send_command_custom(command, content)
            except Exception as e:
                logger.error("Custom command failed: %s", e)
                return f"Error: {e}"
        # Non-custom plugins use plain RCON — combine command + content.
        full = f"{command} {content}".strip() if content else command
        formatted = self.plugin.format_command(full)
        try:
            return await rcon_manager.send_command(self.server_id, formatted)
        except Exception as e:
            logger.error("RCON command failed: %s", e)
            return f"Error: {e}"

    async def get_players(self) -> list[dict]:
        """Get players list as dicts (backward-compatible with old API)."""
        if self.plugin.game_type == "factorio":
            raw = await self.send_command("/players online")
        elif self.plugin.game_type == "minecraft":
            raw = await self.send_command("list")
        elif self.plugin.game_type == "hll":
            # HLL uses custom protocol: GetServerInformation with Name=players
            raw = await self.send_command("GetServerInformation", '{"Name": "players", "Value": ""}')
        else:
            raw = await self.send_command("players")
        players = await self.plugin.parse_players(raw)
        return [{"name": p.name, **({"steam_id": p.steam_id} if p.steam_id else {})} for p in players]

    async def get_status(self) -> dict:
        status = await self.plugin.get_status(self.send_command)
        return {"online": status.online, "player_count": status.player_count, "extra": status.extra or {}}

    async def kick_player(self, player_name: str, reason: str = "") -> str:
        return await self.plugin.kick_player(self.send_command, player_name, reason)

    async def ban_player(self, player_name: str, reason: str = "") -> str:
        return await self.plugin.ban_player(self.send_command, player_name, reason)

    async def unban_player(self, player_name: str) -> str:
        return await self.plugin.unban_player(self.send_command, player_name)

    async def teleport_player(self, player_name: str, x: float, y: float, z: float) -> str:
        return await self.plugin.teleport_player(self.send_command, player_name, x, y, z)

    async def give_item(self, player_name: str, item: str, count: int = 1) -> str:
        return await self.plugin.give_item(self.send_command, player_name, item, count)

    async def get_maps(self) -> list[str]:
        return await self.plugin.get_maps(self.send_command)

    async def change_map(self, map_name: str) -> str:
        return await self.plugin.change_map(self.send_command, map_name)

    async def get_player_roles(self) -> list[str]:
        return await self.plugin.get_player_roles()

    async def promote_player(self, player_name: str, role: str) -> str:
        return await self.plugin.promote_player(self.send_command, player_name, role)

    async def demote_player(self, player_name: str) -> str:
        return await self.plugin.demote_player(self.send_command, player_name)

    async def message_player(self, player_name: str, message: str) -> str:
        return await self.plugin.message_player(self.send_command, player_name, message)

    async def get_chat(self) -> list[dict]:
        """Get recent chat messages. For plugins that track events (e.g. HLL),
        pull chat from poll_events. Others return empty."""
        try:
            events = await self.plugin.poll_events(self.send_command)
            return [
                {"player": e.get("player_name", "Unknown"), "message": e.get("message", "")}
                for e in events
                if e.get("event_type") == "chat" and e.get("message")
            ]
        except NotImplementedError:
            return []
        except Exception:
            return []

    async def poll_events(self, since: str | None = None) -> list[dict]:
        """Poll for game events via the plugin."""
        return await self.plugin.poll_events(self.send_command, since=since)

    async def get_options(self):
        return await self.plugin.get_options(self.send_command)

    async def set_option(self, name: str, value: str) -> str:
        return await self.plugin.set_option(self.send_command, name, value)

    async def connect(self, host: str, port: int, password: str, *, server_id: int = 0) -> None:
        self.server_id = server_id
        if self._uses_custom:
            await self.plugin.connect_custom(host, port, password)
        else:
            await rcon_manager.connect(server_id, host, port, password)

    async def disconnect(self) -> None:
        if self._uses_custom:
            await self.plugin.disconnect_custom()
        else:
            await rcon_manager.disconnect(self.server_id)

    def get_commands(self, version: str | None = None):
        """Return commands via legacy schema registry (for backward compat)."""
        from app.schemas.rcon_commands import get_schema
        return get_schema(self.plugin.game_type, version)


def get_plugin(game_type: str, loader: PluginLoader | None = None) -> ConnectedPlugin:
    """Get a ConnectedPlugin for the given game type.

    If loader is None, attempts to get it from the running FastAPI app state.
    """
    if loader is None:
        loader = _get_loader_from_app()

    plugin = loader.get_plugin(game_type)
    if plugin is None:
        available = [p["id"] for p in loader.list_plugins()]
        raise ValueError(f"Unknown game type: {game_type}. Available: {available}")

    # Stateful plugins (custom_connection=True) hold per-connection state.
    # Always give callers a fresh instance to avoid shared-state races.
    if getattr(plugin, "custom_connection", False):
        fresh = loader.new_instance(game_type)
        if fresh is not None:
            plugin = fresh

    return ConnectedPlugin(plugin, server_id=0)


# Module-level loader — set by the ARQ worker startup so background jobs
# can resolve plugins without a FastAPI app instance.
_standalone_loader: PluginLoader | None = None


def set_standalone_loader(loader: PluginLoader) -> None:
    """Register a plugin loader for use outside FastAPI (e.g. ARQ worker)."""
    global _standalone_loader
    _standalone_loader = loader


def _get_loader_from_app() -> PluginLoader:
    """Try to get the plugin loader from the FastAPI app state or the standalone loader."""
    if _standalone_loader is not None:
        return _standalone_loader
    # Import here to avoid circular imports
    try:
        from app.main import app
        return app.state.plugin_loader
    except (ImportError, AttributeError):
        raise RuntimeError("Plugin loader not initialized. Is the app running?")
