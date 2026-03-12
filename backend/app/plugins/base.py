from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
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
    type: str  # "string", "integer", "boolean", "choice"
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
    option_type: str  # "boolean", "integer", "float", "string", "choice"
    category: str = "General"
    description: str = ""
    min_val: Optional[float] = None
    max_val: Optional[float] = None
    choices: list[str] = field(default_factory=list)


class GamePlugin(ABC):
    """Base class for all Garrison game plugins. API version 1."""

    PLUGIN_API_VERSION = 1

    @property
    @abstractmethod
    def game_type(self) -> str: ...

    @property
    @abstractmethod
    def display_name(self) -> str: ...

    @abstractmethod
    async def parse_players(self, raw_response: str) -> list[PlayerInfo]: ...

    @abstractmethod
    async def get_status(self, send_command) -> ServerStatus: ...

    @abstractmethod
    def get_commands(self) -> list[CommandDef]: ...

    def format_command(self, command: str) -> str:
        """Override to add prefix (e.g. "/" for Factorio)."""
        return command

    async def get_options(self, send_command) -> list[ServerOption]:
        """Override to support server options."""
        return []

    async def set_option(self, send_command, name: str, value: str) -> str:
        """Override to support setting server options."""
        raise NotImplementedError(f"{self.display_name} does not support server options")

    async def kick_player(self, send_command, name: str, reason: str = "") -> str:
        raise NotImplementedError

    async def ban_player(self, send_command, name: str, reason: str = "") -> str:
        raise NotImplementedError

    async def unban_player(self, send_command, name: str) -> str:
        raise NotImplementedError
