import logging
import re

from app.games.base import GamePlugin
from app.games.schemas.zomboid_v1 import register as _register_zomboid_v1
from app.rcon.manager import rcon_manager

logger = logging.getLogger(__name__)

# Register the PZ command schema on import
_register_zomboid_v1()


class ZomboidPlugin(GamePlugin):
    name = "zomboid"
    display_name = "Project Zomboid"

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
        raw = await self.send_command("players")
        if raw.startswith("Error:"):
            return []
        players = []
        for line in raw.strip().splitlines():
            line = line.strip().lstrip("-").strip()
            if not line or line.lower().startswith("players"):
                continue
            # Try to extract steam ID if present (format: "name (steamid:12345)")
            m = re.match(r"^(.+?)\s*\(steamid:(\d+)\)$", line)
            if m:
                players.append({"name": m.group(1).strip(), "steam_id": m.group(2)})
            else:
                players.append({"name": line})
        return players

    async def kick_player(self, player_name: str, reason: str = "") -> str:
        cmd = f'kickuser "{player_name}" "{reason}"' if reason else f'kickuser "{player_name}"'
        return await self.send_command(cmd)

    async def ban_player(self, player_name: str, reason: str = "") -> str:
        cmd = f'banuser "{player_name}" "{reason}"' if reason else f'banuser "{player_name}"'
        return await self.send_command(cmd)

    async def unban_player(self, player_name: str) -> str:
        return await self.send_command(f'unbanuser "{player_name}"')

    async def broadcast(self, message: str) -> str:
        return await self.send_command(f'servermsg "{message}"')

    async def get_chat(self) -> list[str]:
        return []

    async def get_status(self) -> dict:
        try:
            players = await self.get_players()
            return {"online": True, "player_count": len(players)}
        except Exception:
            return {"online": False, "player_count": 0}
