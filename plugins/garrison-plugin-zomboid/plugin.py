"""Garrison plugin for Project Zomboid dedicated servers."""

import re

from app.plugins.base import GamePlugin, PlayerInfo, ServerStatus, CommandDef, ServerOption


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
