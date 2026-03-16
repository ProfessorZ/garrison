"""Garrison plugin for Hell Let Loose dedicated servers."""

import json
import logging

try:
    from app.plugins.base import GamePlugin, PlayerInfo, ServerStatus, CommandDef, ServerOption
except ImportError:
    from dataclasses import dataclass, field
    from abc import ABC, abstractmethod
    from typing import Optional

    @dataclass
    class PlayerInfo:
        name: str
        steam_id: Optional[str] = None

    @dataclass
    class ServerStatus:
        online: bool
        player_count: int = 0
        version: Optional[str] = None
        extra: dict = field(default_factory=dict)

    @dataclass
    class CommandParam:
        name: str
        type: str
        required: bool = True
        description: str = ""
        choices: list[str] = field(default_factory=list)
        default: Optional[str] = None

    @dataclass
    class CommandDef:
        name: str
        description: str
        category: str
        params: list[CommandParam] = field(default_factory=list)
        admin_only: bool = False
        example: str = ""

    @dataclass
    class ServerOption:
        name: str
        value: str
        option_type: str
        category: str = "General"
        description: str = ""
        min_val: Optional[float] = None
        max_val: Optional[float] = None
        choices: list[str] = field(default_factory=list)

    class GamePlugin(ABC):
        PLUGIN_API_VERSION = 1
        custom_connection: bool = False

        @property
        @abstractmethod
        def game_type(self) -> str: ...

        @property
        @abstractmethod
        def display_name(self) -> str: ...

        @abstractmethod
        async def parse_players(self, raw_response: str) -> list: ...

        @abstractmethod
        async def get_status(self, send_command) -> ServerStatus: ...

        @abstractmethod
        def get_commands(self) -> list: ...

        def format_command(self, command: str) -> str:
            return command

        async def get_options(self, send_command) -> list:
            return []

        async def set_option(self, send_command, name: str, value: str) -> str:
            raise NotImplementedError

        async def kick_player(self, send_command, name: str, reason: str = "") -> str:
            raise NotImplementedError

        async def ban_player(self, send_command, name: str, reason: str = "") -> str:
            raise NotImplementedError

        async def unban_player(self, send_command, name: str) -> str:
            raise NotImplementedError

        async def connect_custom(self, host: str, port: int, password: str) -> None:
            raise NotImplementedError

        async def disconnect_custom(self) -> None:
            raise NotImplementedError

        async def send_command_custom(self, command: str) -> str:
            raise NotImplementedError
from hll_connection import HLLConnection

logger = logging.getLogger(__name__)


class HLLPlugin(GamePlugin):
    """Hell Let Loose RCON plugin using the custom HLL JSON-over-TCP protocol."""

    custom_connection = True

    def __init__(self):
        self._connection: HLLConnection | None = None

    @property
    def game_type(self) -> str:
        return "hll"

    @property
    def display_name(self) -> str:
        return "Hell Let Loose"

    # ── Custom connection lifecycle ────────────────────────────────

    async def connect_custom(self, host: str, port: int, password: str) -> None:
        if self._connection and self._connection.connected:
            await self._connection.close()
        self._connection = HLLConnection(host, port, password)
        await self._connection.connect()

    async def disconnect_custom(self) -> None:
        if self._connection:
            await self._connection.close()
            self._connection = None

    async def send_command_custom(self, command: str) -> str:
        """Send an HLL command.

        Accepts either a bare command name (e.g. "GetSlots") or
        "CommandName {json_content}" for commands that need a body.
        Returns the full response as a JSON string.
        """
        if not self._connection or not self._connection.connected:
            return json.dumps({"statusCode": 0, "statusMessage": "Not connected"})
        parts = command.split(" ", 1)
        cmd_name = parts[0]
        content = parts[1] if len(parts) > 1 else ""
        resp = await self._connection.send(cmd_name, content=content)
        return json.dumps(resp)

    # ── Helpers ────────────────────────────────────────────────────

    def _parse_response(self, raw: str) -> dict:
        """Parse a JSON response string, returning the dict."""
        data = json.loads(raw) if isinstance(raw, str) else raw
        return data

    def _get_content(self, data: dict):
        """Extract and parse contentBody from a response."""
        content = data.get("contentBody", "")
        if isinstance(content, str):
            try:
                return json.loads(content)
            except (json.JSONDecodeError, TypeError):
                return content
        return content

    # ── GamePlugin interface ───────────────────────────────────────

    async def parse_players(self, raw_response: str) -> list[PlayerInfo]:
        data = self._parse_response(raw_response)
        content = self._get_content(data)
        if not isinstance(content, list):
            return []
        players = []
        for entry in content:
            if isinstance(entry, dict):
                players.append(PlayerInfo(
                    name=entry.get("name", "Unknown"),
                    steam_id=entry.get("player_id"),
                ))
            elif isinstance(entry, str):
                players.append(PlayerInfo(name=entry))
        return players

    async def get_status(self, send_command) -> ServerStatus:
        try:
            slots_raw = await send_command("GetSlots")
            slots = self._parse_response(slots_raw)
            content = self._get_content(slots)
            if isinstance(content, dict):
                current = content.get("current_players", 0)
                maximum = content.get("max_players", 0)
            else:
                current, maximum = 0, 0

            extra: dict = {"max_players": maximum}

            # Try to get server name
            try:
                name_raw = await send_command("GetServerName")
                name_data = self._parse_response(name_raw)
                name_content = self._get_content(name_data)
                if isinstance(name_content, str):
                    extra["server_name"] = name_content
                elif isinstance(name_content, dict):
                    extra["server_name"] = name_content.get("name", "")
            except Exception:
                pass

            return ServerStatus(
                online=True,
                player_count=int(current),
                extra=extra,
            )
        except Exception:
            return ServerStatus(online=False, player_count=0)

    def get_commands(self) -> list[CommandDef]:
        from schema import get_commands
        return get_commands()

    async def get_options(self, send_command) -> list[ServerOption]:
        from options import fetch_options
        return await fetch_options(send_command)

    async def set_option(self, send_command, name: str, value: str) -> str:
        from options import set_option
        return await set_option(send_command, name, value)

    async def kick_player(self, send_command, name: str, reason: str = "") -> str:
        # Look up player_id by name
        raw = await send_command("GetPlayerIds")
        players = await self.parse_players(raw)
        player = next((p for p in players if p.name == name), None)
        if not player or not player.steam_id:
            return f"Error: player '{name}' not found or has no Steam ID"
        content = {"player_id": player.steam_id, "reason": reason or "Kicked by admin"}
        result_raw = await send_command(f"KickPlayerById {json.dumps(content)}")
        result = self._parse_response(result_raw)
        if result.get("statusCode") == 200:
            return f"Kicked {name} ({player.steam_id})"
        return f"Kick failed: {result.get('statusMessage', 'unknown error')}"

    async def ban_player(self, send_command, name: str, reason: str = "") -> str:
        raw = await send_command("GetPlayerIds")
        players = await self.parse_players(raw)
        player = next((p for p in players if p.name == name), None)
        if not player or not player.steam_id:
            return f"Error: player '{name}' not found or has no Steam ID"
        content = {
            "player_id": player.steam_id,
            "reason": reason or "Banned by admin",
            "by_admin_name": "Garrison",
        }
        result_raw = await send_command(f"PermanentBanByPlayerId {json.dumps(content)}")
        result = self._parse_response(result_raw)
        if result.get("statusCode") == 200:
            return f"Permanently banned {name} ({player.steam_id})"
        return f"Ban failed: {result.get('statusMessage', 'unknown error')}"

    async def unban_player(self, send_command, name: str) -> str:
        # For unban, name is treated as a Steam ID since we can't look up offline players
        content = {"player_id": name}
        result_raw = await send_command(f"UnbanByPlayerId {json.dumps(content)}")
        result = self._parse_response(result_raw)
        if result.get("statusCode") == 200:
            return f"Unbanned {name}"
        return f"Unban failed: {result.get('statusMessage', 'unknown error')}"
