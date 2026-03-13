import csv
import io
import logging
from datetime import datetime, timezone

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ban_list import BanList, BanListEntry, ServerBanList
from app.models.known_player import KnownPlayer
from app.models.server import Server
from app.auth.security import decrypt_rcon_password
from app.plugins.bridge import get_plugin

logger = logging.getLogger(__name__)


class BanListService:

    async def check_player(self, db: AsyncSession, player_name: str, server_id: int) -> BanListEntry | None:
        """Check if player is on any active ban list for this server."""
        now = datetime.now(timezone.utc)

        # Find ban lists applied to this server (explicit assignment or global)
        ban_list_ids_q = select(ServerBanList.ban_list_id).where(
            ServerBanList.server_id == server_id,
            ServerBanList.auto_enforce == True,  # noqa: E712
        )
        global_ids_q = select(BanList.id).where(BanList.is_global == True)  # noqa: E712

        result = await db.execute(
            select(BanListEntry).where(
                BanListEntry.is_active == True,  # noqa: E712
                BanListEntry.player_name == player_name,
                or_(
                    BanListEntry.ban_list_id.in_(ban_list_ids_q),
                    BanListEntry.ban_list_id.in_(global_ids_q),
                ),
                or_(
                    BanListEntry.expires_at.is_(None),
                    BanListEntry.expires_at > now,
                ),
            ).limit(1)
        )
        return result.scalar_one_or_none()

    async def sync_to_server(self, db: AsyncSession, server_id: int, ban_list_id: int) -> int:
        """Push all active bans from a ban list to a server via RCON. Returns count of bans pushed."""
        server_result = await db.execute(select(Server).where(Server.id == server_id))
        server = server_result.scalar_one_or_none()
        if not server:
            raise ValueError("Server not found")

        now = datetime.now(timezone.utc)
        entries_result = await db.execute(
            select(BanListEntry).where(
                BanListEntry.ban_list_id == ban_list_id,
                BanListEntry.is_active == True,  # noqa: E712
                or_(
                    BanListEntry.expires_at.is_(None),
                    BanListEntry.expires_at > now,
                ),
            )
        )
        entries = entries_result.scalars().all()

        if not entries:
            return 0

        plugin = get_plugin(server.game_type)
        password = decrypt_rcon_password(server.rcon_password_encrypted)
        count = 0
        try:
            await plugin.connect(server.host, server.rcon_port, password, server_id=server.id)
            for entry in entries:
                try:
                    send_cmd = plugin.format_command
                    await plugin.ban_player(
                        lambda cmd: plugin.send_command(cmd) if hasattr(plugin, 'send_command') else None,
                        entry.player_name,
                        entry.reason or "Banned via ban list",
                    )
                    count += 1
                except Exception as e:
                    logger.warning("Failed to ban %s on server %s: %s", entry.player_name, server_id, e)
        finally:
            try:
                await plugin.disconnect()
            except Exception:
                pass

        return count

    async def import_from_server(self, db: AsyncSession, server_id: int, ban_list_id: int, user_id: int) -> int:
        """Import bans from a server into a ban list. Returns count of entries added."""
        server_result = await db.execute(select(Server).where(Server.id == server_id))
        server = server_result.scalar_one_or_none()
        if not server:
            raise ValueError("Server not found")

        plugin = get_plugin(server.game_type)
        password = decrypt_rcon_password(server.rcon_password_encrypted)
        count = 0
        try:
            await plugin.connect(server.host, server.rcon_port, password, server_id=server.id)
            # Try to get ban list from server via RCON
            if hasattr(plugin, 'send_command'):
                raw = await plugin.send_command("banlist")
            else:
                return 0

            # Parse names from response (one name per line is common)
            names = [line.strip() for line in raw.strip().split("\n") if line.strip() and not line.startswith("#")]

            for name in names:
                # Skip if already in this ban list
                existing = await db.execute(
                    select(BanListEntry).where(
                        BanListEntry.ban_list_id == ban_list_id,
                        BanListEntry.player_name == name,
                        BanListEntry.is_active == True,  # noqa: E712
                    )
                )
                if existing.scalar_one_or_none():
                    continue

                # Try to link to known player
                kp_result = await db.execute(select(KnownPlayer).where(KnownPlayer.name == name))
                kp = kp_result.scalar_one_or_none()

                entry = BanListEntry(
                    ban_list_id=ban_list_id,
                    player_id=kp.id if kp else None,
                    player_name=name,
                    reason="Imported from server",
                    added_by_user_id=user_id,
                    is_active=True,
                )
                db.add(entry)
                count += 1

            await db.commit()
        finally:
            try:
                await plugin.disconnect()
            except Exception:
                pass

        return count

    async def export_csv(self, db: AsyncSession, ban_list_id: int) -> str:
        """Export ban list as CSV: name,reason,expires_at"""
        entries_result = await db.execute(
            select(BanListEntry).where(
                BanListEntry.ban_list_id == ban_list_id,
                BanListEntry.is_active == True,  # noqa: E712
            ).order_by(BanListEntry.player_name)
        )
        entries = entries_result.scalars().all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["name", "reason", "expires_at"])
        for entry in entries:
            writer.writerow([
                entry.player_name,
                entry.reason or "",
                entry.expires_at.isoformat() if entry.expires_at else "",
            ])
        return output.getvalue()

    async def import_csv(self, db: AsyncSession, ban_list_id: int, csv_content: str, added_by_user_id: int) -> int:
        """Import bans from CSV into a ban list. Returns count of entries added."""
        reader = csv.DictReader(io.StringIO(csv_content))
        count = 0

        for row in reader:
            name = row.get("name", "").strip()
            if not name:
                continue

            reason = row.get("reason", "").strip() or None
            expires_str = row.get("expires_at", "").strip()
            expires_at = None
            if expires_str:
                try:
                    expires_at = datetime.fromisoformat(expires_str)
                except ValueError:
                    pass

            # Skip duplicates
            existing = await db.execute(
                select(BanListEntry).where(
                    BanListEntry.ban_list_id == ban_list_id,
                    BanListEntry.player_name == name,
                    BanListEntry.is_active == True,  # noqa: E712
                )
            )
            if existing.scalar_one_or_none():
                continue

            # Try to link to known player
            kp_result = await db.execute(select(KnownPlayer).where(KnownPlayer.name == name))
            kp = kp_result.scalar_one_or_none()

            entry = BanListEntry(
                ban_list_id=ban_list_id,
                player_id=kp.id if kp else None,
                player_name=name,
                reason=reason,
                expires_at=expires_at,
                added_by_user_id=added_by_user_id,
                is_active=True,
            )
            db.add(entry)
            count += 1

        await db.commit()
        return count


ban_list_service = BanListService()
