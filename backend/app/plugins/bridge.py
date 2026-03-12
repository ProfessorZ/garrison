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

    async def send_command(self, command: str) -> str:
        """Send a command through the RCON manager, applying plugin formatting."""
        formatted = self.plugin.format_command(command)
        try:
            return await rcon_manager.send_command(self.server_id, formatted)
        except Exception as e:
            logger.error("RCON command failed: %s", e)
            return f"Error: {e}"

    async def get_players(self) -> list[dict]:
        """Get players list as dicts (backward-compatible with old API)."""
        raw = await self.send_command("players" if self.plugin.game_type != "factorio" else "/players online")
        players = await self.plugin.parse_players(raw)
        return [{"name": p.name, **({"steam_id": p.steam_id} if p.steam_id else {})} for p in players]

    async def get_status(self) -> dict:
        status = await self.plugin.get_status(self.send_command)
        return {"online": status.online, "player_count": status.player_count}

    async def kick_player(self, player_name: str, reason: str = "") -> str:
        return await self.plugin.kick_player(self.send_command, player_name, reason)

    async def ban_player(self, player_name: str, reason: str = "") -> str:
        return await self.plugin.ban_player(self.send_command, player_name, reason)

    async def unban_player(self, player_name: str) -> str:
        return await self.plugin.unban_player(self.send_command, player_name)

    async def get_chat(self) -> list[str]:
        return []

    async def get_options(self):
        return await self.plugin.get_options(self.send_command)

    async def set_option(self, name: str, value: str) -> str:
        return await self.plugin.set_option(self.send_command, name, value)

    async def connect(self, host: str, port: int, password: str, *, server_id: int = 0) -> None:
        self.server_id = server_id
        await rcon_manager.connect(server_id, host, port, password)

    async def disconnect(self) -> None:
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

    return ConnectedPlugin(plugin, server_id=0)


def _get_loader_from_app() -> PluginLoader:
    """Try to get the plugin loader from the FastAPI app state."""
    # Import here to avoid circular imports
    try:
        from app.main import app
        return app.state.plugin_loader
    except (ImportError, AttributeError):
        raise RuntimeError("Plugin loader not initialized. Is the app running?")
