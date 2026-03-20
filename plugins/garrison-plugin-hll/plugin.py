"""Garrison plugin for Hell Let Loose dedicated servers."""

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
    """Hell Let Loose RCON plugin using the XOR plaintext protocol."""

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
        """Send a raw HLL RCON command and return the plaintext response."""
        if not self._connection or not self._connection.connected:
            return "ERROR: Not connected"
        return await self._connection.send(command)

    # ── GamePlugin interface ───────────────────────────────────────

    async def parse_players(self, raw_response: str) -> list[PlayerInfo]:
        """Parse the GetPlayerIds response.

        HLL returns lines like:
            PlayerName : 76561198012345678
        """
        players = []
        for line in raw_response.splitlines():
            line = line.strip()
            if not line:
                continue
            if " : " in line:
                name, steam_id = line.rsplit(" : ", 1)
                players.append(PlayerInfo(name=name.strip(), steam_id=steam_id.strip()))
            else:
                players.append(PlayerInfo(name=line))
        return players

    async def get_status(self, send_command) -> ServerStatus:
        try:
            # GetSlots returns e.g. "50/100"
            slots_raw = await send_command("GetSlots")
            current, maximum = 0, 0
            if "/" in slots_raw:
                parts = slots_raw.split("/", 1)
                current = int(parts[0].strip())
                maximum = int(parts[1].strip())

            extra: dict = {"max_players": maximum}

            try:
                name_raw = await send_command("GetServerName")
                if name_raw:
                    extra["server_name"] = name_raw
            except Exception:
                pass

            return ServerStatus(
                online=True,
                player_count=current,
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
        reason = reason or "Kicked by admin"
        result = await send_command(f"Kick {name} {reason}")
        if result.upper().startswith("SUCCESS"):
            return f"Kicked {name}"
        return f"Kick failed: {result}"

    async def ban_player(self, send_command, name: str, reason: str = "") -> str:
        # Look up steam ID first
        raw = await send_command("GetPlayerIds")
        players = await self.parse_players(raw)
        player = next((p for p in players if p.name == name), None)
        if not player or not player.steam_id:
            return f"Error: player '{name}' not found or has no Steam ID"
        reason = reason or "Banned by admin"
        result = await send_command(f"BanById {player.steam_id} {reason}")
        if result.upper().startswith("SUCCESS"):
            return f"Permanently banned {name} ({player.steam_id})"
        return f"Ban failed: {result}"

    async def unban_player(self, send_command, name: str) -> str:
        # name is treated as a Steam ID for unbans
        result = await send_command(f"PardonById {name}")
        if result.upper().startswith("SUCCESS"):
            return f"Unbanned {name}"
        return f"Unban failed: {result}"
