"""Garrison plugin for Hell Let Loose dedicated servers."""

from __future__ import annotations

from typing import Optional

from app.plugins.base import GamePlugin, PlayerInfo, ServerStatus, CommandDef, ServerOption


class HellLetLoosePlugin(GamePlugin):
    """Hell Let Loose RCON plugin."""

    rcon_protocol = "hll"

    def __init__(self) -> None:
        self._client = None

    @property
    def game_type(self) -> str:
        return "hll"

    @property
    def display_name(self) -> str:
        return "Hell Let Loose"

    async def parse_players(self, raw_response: str) -> list[PlayerInfo]:
        """Fallback parser for raw player list responses (tab-separated)."""
        players: list[PlayerInfo] = []
        parts = [p.strip() for p in raw_response.split("\t") if p.strip()]
        if parts and parts[0].isdigit():
            parts = parts[1:]
        for entry in parts:
            name = entry
            steam_id: Optional[str] = None
            if ":" in entry:
                before, after = entry.split(":", 1)
                name = before.strip()
                steam_id = after.strip()
            if name:
                players.append(PlayerInfo(name=name, steam_id=steam_id or None))
        return players

    async def get_status(self, send_command) -> ServerStatus:
        """Use the native HLL client to fetch session info."""
        client = getattr(self, "_client", None)
        if client:
            try:
                session = await client.get_server_session()
                return ServerStatus(
                    online=True,
                    player_count=session.player_count,
                    extra={"map": session.map_name, "mode": session.game_mode_id},
                )
            except Exception:
                pass
        return ServerStatus(online=False, player_count=0)

    def get_commands(self) -> list[CommandDef]:
        from schema import get_commands
        return get_commands()

    async def get_options(self, send_command) -> list[ServerOption]:
        client = getattr(self, "_client", None)
        if not client:
            return []

        options: list[ServerOption] = []
        try:
            idle = await client.get_idle_kick_duration()
            options.append(ServerOption(
                name="idle_kick_minutes",
                value=str(idle.minutes),
                option_type="integer",
                category="Server",
                description="Minutes before idle players are kicked (0 disables)",
                min_val=0,
            ))
        except Exception:
            pass

        try:
            hp = await client.get_high_ping_threshold()
            options.append(ServerOption(
                name="high_ping_threshold_ms",
                value=str(hp.threshold),
                option_type="integer",
                category="Server",
                description="Ping threshold (ms) before auto-kick",
                min_val=0,
            ))
        except Exception:
            pass

        try:
            auto = await client.get_auto_balance_enabled()
            options.append(ServerOption(
                name="auto_balance_enabled",
                value=str(auto.enabled).lower(),
                option_type="boolean",
                category="Server",
                description="Enable automatic team balance",
            ))
        except Exception:
            pass

        try:
            abt = await client.get_auto_balance_threshold()
            options.append(ServerOption(
                name="auto_balance_threshold",
                value=str(abt.threshold),
                option_type="integer",
                category="Server",
                description="Team size delta that triggers auto balance",
                min_val=0,
            ))
        except Exception:
            pass

        try:
            vke = await client.get_vote_kick_enabled()
            options.append(ServerOption(
                name="vote_kick_enabled",
                value=str(vke.enabled).lower(),
                option_type="boolean",
                category="Server",
                description="Allow players to start vote kicks",
            ))
        except Exception:
            pass

        return options

    async def set_option(self, send_command, name: str, value: str) -> str:
        client = getattr(self, "_client", None)
        if not client:
            raise ValueError("HLL client not connected")

        try:
            if name == "idle_kick_minutes":
                await client.set_idle_kick_duration(int(value))
            elif name == "high_ping_threshold_ms":
                await client.set_high_ping_threshold(int(value))
            elif name == "auto_balance_enabled":
                await client.set_auto_balance_enabled(value.lower() in ("true", "1", "yes", "on"))
            elif name == "auto_balance_threshold":
                await client.set_auto_balance_threshold(int(value))
            elif name == "vote_kick_enabled":
                await client.set_vote_kick_enabled(value.lower() in ("true", "1", "yes", "on"))
            else:
                raise ValueError(f"Unknown option: {name}")
        except Exception as e:
            return f"Error: {e}"

        return "OK"

    async def _resolve_player_id(self, target: str):
        """Find a player's ID by name; falls back to the provided target."""
        client = getattr(self, "_client", None)
        if not client:
            return target
        try:
            players = await client.get_players()
            for p in players.players:
                if p.name.lower() == target.lower():
                    return p.id
        except Exception:
            pass
        return target

    async def kick_player(self, send_command, name: str, reason: str = "") -> str:
        client = getattr(self, "_client", None)
        if not client:
            return "Error: HLL client not connected"
        player_id = await self._resolve_player_id(name)
        message = reason or "Kicked via Garrison"
        try:
            await client.kick_player(player_id, message)
            return f"Kicked {name}"
        except Exception as e:
            return f"Error: {e}"

    async def ban_player(self, send_command, name: str, reason: str = "") -> str:
        client = getattr(self, "_client", None)
        if not client:
            return "Error: HLL client not connected"
        player_id = await self._resolve_player_id(name)
        try:
            await client.ban_player(player_id, reason or "Banned via Garrison", "Garrison")
            return f"Banned {name}"
        except Exception as e:
            return f"Error: {e}"

    async def unban_player(self, send_command, name: str) -> str:
        client = getattr(self, "_client", None)
        if not client:
            return "Error: HLL client not connected"
        player_id = await self._resolve_player_id(name)
        try:
            await client.unban_player(player_id)
            return f"Unbanned {name}"
        except Exception as e:
            return f"Error: {e}"
