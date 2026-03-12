import logging
import re

from app.games.base import GamePlugin
from app.games.schemas.factorio_v1 import register as _register_factorio_v1
from app.rcon.manager import rcon_manager

logger = logging.getLogger(__name__)

# Register the Factorio command schema on import
_register_factorio_v1()


class FactorioPlugin(GamePlugin):
    name = "factorio"
    display_name = "Factorio"

    def __init__(self):
        self._server_id: int | None = None
        self._host: str = ""
        self._port: int = 0
        self._password: str = ""

    async def connect(self, host: str, port: int, password: str, *, server_id: int = 0) -> None:
        self._host = host
        self._port = port
        self._password = password
        self._server_id = server_id
        await rcon_manager.connect(server_id, host, port, password)

    async def disconnect(self) -> None:
        if self._server_id is not None:
            await rcon_manager.disconnect(self._server_id)
        self._server_id = None

    async def send_command(self, command: str, *, validate: bool = False) -> str:
        if self._server_id is None:
            return "Error: not connected"
        # Factorio RCON commands must be prefixed with "/"
        if command.strip() and not command.strip().startswith("/"):
            command = "/" + command.strip()
        if validate:
            cmd_name = command.split()[0] if command.strip() else ""
            schema = self.get_commands()
            if schema and not any(c.name == cmd_name for c in schema.commands):
                return f"Error: unknown command '{cmd_name}'"
        try:
            return await rcon_manager.send_command(self._server_id, command)
        except Exception as e:
            logger.error("RCON command failed: %s", e)
            return f"Error: {e}"

    async def get_players(self) -> list[dict]:
        """Parse Factorio /players online output.

        Factorio returns lines like:
          PlayerName (online)
        or on newer versions:
          PlayerName (online, afk for 5 minutes)
        The first line is usually a header like "Online players (2):"
        """
        raw = await self.send_command("/players online")
        if raw.startswith("Error:"):
            return []
        players: list[dict] = []
        for line in raw.strip().splitlines():
            line = line.strip()
            # Skip header lines like "Online players (2):" or empty lines
            if not line or re.match(r"^(Online\s+players|Players)\s*\(?\d*\)?\s*:?$", line, re.IGNORECASE):
                continue
            # Extract player name — everything before the first " ("
            m = re.match(r"^\s*(.+?)\s*\(online.*\)\s*$", line, re.IGNORECASE)
            if m:
                players.append({"name": m.group(1).strip()})
            else:
                # Fallback: treat the whole line as a player name (stripped)
                cleaned = line.strip().rstrip("()")
                if cleaned:
                    players.append({"name": cleaned})
        return players

    async def kick_player(self, player_name: str, reason: str = "") -> str:
        cmd = f"/kick {player_name} {reason}".rstrip()
        return await self.send_command(cmd)

    async def ban_player(self, player_name: str, reason: str = "") -> str:
        cmd = f"/ban {player_name} {reason}".rstrip()
        return await self.send_command(cmd)

    async def unban_player(self, player_name: str) -> str:
        return await self.send_command(f"/unban {player_name}")

    async def broadcast(self, message: str) -> str:
        # Factorio: sending text without "/" prefix acts as a chat message
        # via RCON the message appears as "[server]: message"
        return await rcon_manager.send_command(self._server_id, message)

    async def get_chat(self) -> list[str]:
        return []

    async def get_status(self) -> dict:
        try:
            raw = await self.send_command("/version")
            if raw.startswith("Error:"):
                return {"online": False, "player_count": 0}
            players = await self.get_players()
            return {"online": True, "player_count": len(players)}
        except Exception:
            return {"online": False, "player_count": 0}
