import asyncio
import logging

from rcon.source import Client as RconClient

from app.games.base import GamePlugin

logger = logging.getLogger(__name__)


class ZomboidPlugin(GamePlugin):
    name = "zomboid"
    display_name = "Project Zomboid"

    def __init__(self):
        self._host: str = ""
        self._port: int = 0
        self._password: str = ""

    async def connect(self, host: str, port: int, password: str) -> None:
        self._host = host
        self._port = port
        self._password = password

    async def disconnect(self) -> None:
        self._host = ""
        self._port = 0
        self._password = ""

    def _rcon_command(self, command: str) -> str:
        with RconClient(self._host, self._port, passwd=self._password) as client:
            return client.run(command)

    async def send_command(self, command: str) -> str:
        try:
            return await asyncio.to_thread(self._rcon_command, command)
        except Exception as e:
            logger.error("RCON command failed: %s", e)
            return f"Error: {e}"

    async def get_players(self) -> list[dict]:
        raw = await self.send_command("players")
        players = []
        for line in raw.strip().splitlines():
            line = line.strip().lstrip("-").strip()
            if line and not line.lower().startswith("players"):
                players.append({"name": line})
        return players

    async def kick_player(self, player_name: str, reason: str = "") -> str:
        cmd = f'kickuser "{player_name}" "{reason}"' if reason else f'kickuser "{player_name}"'
        return await self.send_command(cmd)

    async def ban_player(self, player_name: str, reason: str = "") -> str:
        cmd = f'banuser "{player_name}" "{reason}"' if reason else f'banuser "{player_name}"'
        return await self.send_command(cmd)

    async def get_chat(self) -> list[str]:
        return []

    async def get_status(self) -> dict:
        try:
            players = await self.get_players()
            return {"online": True, "player_count": len(players)}
        except Exception:
            return {"online": False, "player_count": 0}
