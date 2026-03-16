"""Garrison plugin for Factorio dedicated servers."""

import re

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


class FactorioPlugin(GamePlugin):
    """Factorio RCON plugin."""

    @property
    def game_type(self) -> str:
        return "factorio"

    @property
    def display_name(self) -> str:
        return "Factorio"

    def format_command(self, command: str) -> str:
        """Factorio RCON commands must be prefixed with /."""
        if command.strip() and not command.strip().startswith("/"):
            return "/" + command.strip()
        return command

    async def parse_players(self, raw_response: str) -> list[PlayerInfo]:
        if raw_response.startswith("Error:"):
            return []
        players: list[PlayerInfo] = []
        for line in raw_response.strip().splitlines():
            line = line.strip()
            if not line or re.match(
                r"^(Online\s+players|Players)\s*\(?\d*\)?\s*:?$", line, re.IGNORECASE
            ):
                continue
            m = re.match(r"^\s*(.+?)\s*\(online.*\)\s*$", line, re.IGNORECASE)
            if m:
                players.append(PlayerInfo(name=m.group(1).strip()))
            else:
                cleaned = line.strip().rstrip("()")
                if cleaned:
                    players.append(PlayerInfo(name=cleaned))
        return players

    async def get_status(self, send_command) -> ServerStatus:
        try:
            raw = await send_command("/version")
            if raw.startswith("Error:"):
                return ServerStatus(online=False, player_count=0)
            player_raw = await send_command("/players online")
            players = await self.parse_players(player_raw)
            return ServerStatus(online=True, player_count=len(players))
        except Exception:
            return ServerStatus(online=False, player_count=0)

    def get_commands(self) -> list[CommandDef]:
        from schema import get_commands
        return get_commands()

    async def get_options(self, send_command) -> list[ServerOption]:
        from options import FACTORIO_CONFIG_OPTIONS, parse_config_value, get_option_meta

        options = []
        for opt_name in FACTORIO_CONFIG_OPTIONS:
            try:
                raw = await send_command(f"/config get {opt_name}")
                value = parse_config_value(raw)
            except Exception:
                value = ""
            opt_type, category, description = get_option_meta(opt_name, value)
            options.append(ServerOption(
                name=opt_name,
                value=value,
                option_type=opt_type,
                category=category,
                description=description,
            ))
        return options

    async def set_option(self, send_command, name: str, value: str) -> str:
        return await send_command(f"/config set {name} {value}")

    async def kick_player(self, send_command, name: str, reason: str = "") -> str:
        cmd = f"/kick {name} {reason}".rstrip()
        return await send_command(cmd)

    async def ban_player(self, send_command, name: str, reason: str = "") -> str:
        cmd = f"/ban {name} {reason}".rstrip()
        return await send_command(cmd)

    async def unban_player(self, send_command, name: str) -> str:
        return await send_command(f"/unban {name}")
