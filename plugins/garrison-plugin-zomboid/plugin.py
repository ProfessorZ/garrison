"""Garrison plugin for Project Zomboid dedicated servers."""

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


class ZomboidPlugin(GamePlugin):
    """Project Zomboid RCON plugin."""

    @property
    def game_type(self) -> str:
        return "zomboid"

    @property
    def display_name(self) -> str:
        return "Project Zomboid"

    async def parse_players(self, raw_response: str) -> list[PlayerInfo]:
        if raw_response.startswith("Error:"):
            return []
        players = []
        for line in raw_response.strip().splitlines():
            line = line.strip().lstrip("-").strip()
            if not line or line.lower().startswith("players"):
                continue
            m = re.match(r"^(.+?)\s*\(steamid:(\d+)\)$", line)
            if m:
                players.append(PlayerInfo(name=m.group(1).strip(), steam_id=m.group(2)))
            else:
                players.append(PlayerInfo(name=line))
        return players

    async def get_status(self, send_command) -> ServerStatus:
        try:
            raw = await send_command("players")
            players = await self.parse_players(raw)
            return ServerStatus(online=True, player_count=len(players))
        except Exception:
            return ServerStatus(online=False, player_count=0)

    def get_commands(self) -> list[CommandDef]:
        from schema import get_commands
        return get_commands()

    async def get_options(self, send_command) -> list[ServerOption]:
        from options import parse_options
        raw = await send_command("showoptions")
        return parse_options(raw)

    async def set_option(self, send_command, name: str, value: str) -> str:
        return await send_command(f'changeoption {name} "{value}"')

    async def kick_player(self, send_command, name: str, reason: str = "") -> str:
        cmd = f'kickuser "{name}" "{reason}"' if reason else f'kickuser "{name}"'
        return await send_command(cmd)

    async def ban_player(self, send_command, name: str, reason: str = "") -> str:
        cmd = f'banuser "{name}" "{reason}"' if reason else f'banuser "{name}"'
        return await send_command(cmd)

    async def unban_player(self, send_command, name: str) -> str:
        return await send_command(f'unbanuser "{name}"')

    async def teleport_player(self, send_command, name: str, x: float, y: float, z: float) -> str:
        return await send_command(f"teleport {name} {x},{y},{z}")

    async def give_item(self, send_command, player: str, item: str, count: int = 1) -> str:
        return await send_command(f"additem {player} {item} {count}")

    async def message_player(self, send_command, name: str, message: str) -> str:
        return await send_command(f'servermsg "{name}" "{message}"')
