import asyncio
import logging
from typing import Optional

import discord
from discord import app_commands
from sqlalchemy import select

from app.auth.security import decrypt_rcon_password
from app.config import settings
from app.database import async_session
from app.models.server import Server
from app.plugins.bridge import get_plugin
from app.services.player_tracker import get_online_players_snapshot

logger = logging.getLogger(__name__)


class GarrisonBot(discord.Client):
    def __init__(self, guild_id: int, admin_role_id: int | None = None):
        intents = discord.Intents.default()
        intents.members = True
        intents.message_content = True
        super().__init__(intents=intents)
        self.tree = app_commands.CommandTree(self)
        self.guild_id = guild_id
        self.admin_role_id = admin_role_id
        self._ready_event = asyncio.Event()

    async def setup_hook(self) -> None:
        guild = discord.Object(id=self.guild_id)
        self.tree.copy_global_to(guild=guild)
        await self.tree.sync(guild=guild)
        logger.info("Slash commands synced to guild %d", self.guild_id)

    async def on_ready(self) -> None:
        logger.info("Discord bot connected as %s (guild %d)", self.user, self.guild_id)
        self._ready_event.set()

    @property
    def is_ready_and_connected(self) -> bool:
        return self._ready_event.is_set() and not self.is_closed()

    @property
    def guild_name(self) -> str | None:
        g = self.get_guild(self.guild_id)
        return g.name if g else None

    @property
    def command_count(self) -> int:
        return len(self.tree.get_commands())


def _has_admin_role(interaction: discord.Interaction, admin_role_id: int | None) -> bool:
    if admin_role_id is None:
        return False
    if not isinstance(interaction.user, discord.Member):
        return False
    return any(r.id == admin_role_id for r in interaction.user.roles)


async def _get_server_choices() -> list[app_commands.Choice[int]]:
    async with async_session() as db:
        result = await db.execute(select(Server))
        servers = result.scalars().all()
    return [app_commands.Choice(name=s.name, value=s.id) for s in servers]


def _setup_commands(bot: GarrisonBot) -> None:
    admin_role_id = bot.admin_role_id

    @bot.tree.command(name="status", description="Show all servers status")
    async def cmd_status(interaction: discord.Interaction) -> None:
        await interaction.response.defer()
        async with async_session() as db:
            result = await db.execute(select(Server))
            servers = result.scalars().all()

        if not servers:
            await interaction.followup.send("No servers configured.")
            return

        snapshot = get_online_players_snapshot()
        embed = discord.Embed(
            title="Server Status",
            color=0x00D4AA,
        )
        for s in servers:
            online = s.last_status is True
            player_count = len(snapshot.get(s.id, set()))
            status_icon = "\U0001f7e2" if online else "\U0001f534"
            value = f"{status_icon} {'Online' if online else 'Offline'}"
            if online:
                value += f" | {player_count} players"
            embed.add_field(
                name=f"{s.name} ({s.game_type})",
                value=value,
                inline=False,
            )
        await interaction.followup.send(embed=embed)

    @bot.tree.command(name="servers", description="List all configured servers")
    async def cmd_servers(interaction: discord.Interaction) -> None:
        await interaction.response.defer()
        async with async_session() as db:
            result = await db.execute(select(Server))
            servers = result.scalars().all()

        if not servers:
            await interaction.followup.send("No servers configured.")
            return

        embed = discord.Embed(title="Configured Servers", color=0x3B82F6)
        for s in servers:
            embed.add_field(
                name=s.name,
                value=f"Game: {s.game_type}\nHost: `{s.host}:{s.port}`\nRCON Port: `{s.rcon_port}`",
                inline=True,
            )
        await interaction.followup.send(embed=embed)

    @bot.tree.command(name="players", description="List online players for a server")
    @app_commands.describe(server="Server name")
    async def cmd_players(interaction: discord.Interaction, server: str) -> None:
        await interaction.response.defer()
        srv = await _find_server(server)
        if not srv:
            await interaction.followup.send(f"Server '{server}' not found.")
            return

        snapshot = get_online_players_snapshot()
        players = snapshot.get(srv.id, set())

        if not players:
            await interaction.followup.send(f"No players online on **{srv.name}**.")
            return

        embed = discord.Embed(
            title=f"Players on {srv.name}",
            description="\n".join(f"- {p}" for p in sorted(players)),
            color=0x00D4AA,
        )
        embed.set_footer(text=f"{len(players)} players online")
        await interaction.followup.send(embed=embed)

    @bot.tree.command(name="rcon", description="Execute RCON command (admin only)")
    @app_commands.describe(server="Server name", command="RCON command to execute")
    async def cmd_rcon(interaction: discord.Interaction, server: str, command: str) -> None:
        if not _has_admin_role(interaction, admin_role_id):
            await interaction.response.send_message("You don't have permission to use this command.", ephemeral=True)
            return

        await interaction.response.defer()
        srv = await _find_server(server)
        if not srv:
            await interaction.followup.send(f"Server '{server}' not found.")
            return

        try:
            plugin = get_plugin(srv.game_type)
            password = decrypt_rcon_password(srv.rcon_password_encrypted)
            await plugin.connect(srv.host, srv.rcon_port, password, server_id=srv.id)
            try:
                output = await plugin.send_command(command)
            finally:
                await plugin.disconnect()

            result_text = output[:1900] if output else "(no output)"
            embed = discord.Embed(
                title=f"RCON: {srv.name}",
                color=0x3B82F6,
            )
            embed.add_field(name="Command", value=f"`{command}`", inline=False)
            embed.add_field(name="Output", value=f"```\n{result_text}\n```", inline=False)
            await interaction.followup.send(embed=embed)
        except Exception as e:
            await interaction.followup.send(f"RCON error: {e}")

    @bot.tree.command(name="kick", description="Kick a player (admin only)")
    @app_commands.describe(server="Server name", player="Player name", reason="Kick reason")
    async def cmd_kick(interaction: discord.Interaction, server: str, player: str, reason: str = "") -> None:
        if not _has_admin_role(interaction, admin_role_id):
            await interaction.response.send_message("You don't have permission to use this command.", ephemeral=True)
            return

        await interaction.response.defer()
        srv = await _find_server(server)
        if not srv:
            await interaction.followup.send(f"Server '{server}' not found.")
            return

        try:
            plugin = get_plugin(srv.game_type)
            password = decrypt_rcon_password(srv.rcon_password_encrypted)
            await plugin.connect(srv.host, srv.rcon_port, password, server_id=srv.id)
            try:
                result = await plugin.kick_player(player, reason)
            finally:
                await plugin.disconnect()

            embed = discord.Embed(
                title=f"Player Kicked: {player}",
                description=f"Kicked from **{srv.name}**" + (f"\nReason: {reason}" if reason else ""),
                color=0xFFBF24,
            )
            await interaction.followup.send(embed=embed)
        except Exception as e:
            await interaction.followup.send(f"Kick failed: {e}")

    @bot.tree.command(name="ban", description="Ban a player (admin only)")
    @app_commands.describe(server="Server name", player="Player name", reason="Ban reason")
    async def cmd_ban(interaction: discord.Interaction, server: str, player: str, reason: str = "") -> None:
        if not _has_admin_role(interaction, admin_role_id):
            await interaction.response.send_message("You don't have permission to use this command.", ephemeral=True)
            return

        await interaction.response.defer()
        srv = await _find_server(server)
        if not srv:
            await interaction.followup.send(f"Server '{server}' not found.")
            return

        try:
            plugin = get_plugin(srv.game_type)
            password = decrypt_rcon_password(srv.rcon_password_encrypted)
            await plugin.connect(srv.host, srv.rcon_port, password, server_id=srv.id)
            try:
                result = await plugin.ban_player(player, reason)
            finally:
                await plugin.disconnect()

            embed = discord.Embed(
                title=f"Player Banned: {player}",
                description=f"Banned from **{srv.name}**" + (f"\nReason: {reason}" if reason else ""),
                color=0xFF4757,
            )
            await interaction.followup.send(embed=embed)
        except Exception as e:
            await interaction.followup.send(f"Ban failed: {e}")


async def _find_server(name: str) -> Server | None:
    async with async_session() as db:
        # Try exact match first, then case-insensitive
        result = await db.execute(select(Server).where(Server.name == name))
        srv = result.scalar_one_or_none()
        if srv:
            return srv
        result = await db.execute(select(Server).where(Server.name.ilike(name)))
        return result.scalar_one_or_none()


# Module-level bot instance
_bot: GarrisonBot | None = None
_bot_task: asyncio.Task | None = None


def get_bot() -> GarrisonBot | None:
    return _bot


async def start_bot(token: str, guild_id: int, admin_role_id: int | None = None) -> None:
    """Start the Discord bot as a background asyncio task."""
    global _bot, _bot_task

    _bot = GarrisonBot(guild_id=guild_id, admin_role_id=admin_role_id)
    _setup_commands(_bot)

    async def _run():
        try:
            await _bot.start(token)
        except Exception as e:
            logger.error("Discord bot failed: %s", e)

    _bot_task = asyncio.create_task(_run())
    logger.info("Discord bot starting...")


async def stop_bot() -> None:
    """Gracefully shut down the Discord bot."""
    global _bot, _bot_task
    if _bot and not _bot.is_closed():
        await _bot.close()
    if _bot_task:
        _bot_task.cancel()
        try:
            await _bot_task
        except (asyncio.CancelledError, Exception):
            pass
    _bot = None
    _bot_task = None
    logger.info("Discord bot stopped")
