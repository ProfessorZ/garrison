from abc import ABC, abstractmethod


class GamePlugin(ABC):
    """Abstract interface for game-specific RCON implementations."""

    name: str = ""
    display_name: str = ""

    @abstractmethod
    async def connect(self, host: str, port: int, password: str, *, server_id: int = 0) -> None:
        """Establish RCON connection."""

    @abstractmethod
    async def disconnect(self) -> None:
        """Close RCON connection."""

    @abstractmethod
    async def send_command(self, command: str) -> str:
        """Send a command and return the response."""

    @abstractmethod
    async def get_players(self) -> list[dict]:
        """Return list of connected players as dicts with at minimum 'name' key."""

    @abstractmethod
    async def kick_player(self, player_name: str, reason: str = "") -> str:
        """Kick a player by name."""

    @abstractmethod
    async def ban_player(self, player_name: str, reason: str = "") -> str:
        """Ban a player by name."""

    @abstractmethod
    async def get_chat(self) -> list[str]:
        """Return recent chat messages."""

    @abstractmethod
    async def get_status(self) -> dict:
        """Return server status info (online, player_count, etc.)."""
