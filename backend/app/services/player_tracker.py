import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import decrypt_rcon_password
from app.config import settings
from app.database import async_session
from app.plugins.bridge import get_plugin
from app.models.known_player import KnownPlayer
from app.models.player_session import PlayerSession
from app.models.player_name import PlayerNameHistory
from app.models.server import Server

logger = logging.getLogger(__name__)

# In-memory state: {server_id: set(player_names)}
_server_players: dict[int, set[str]] = {}


async def _get_online_players(server: Server) -> list[dict]:
    """Query RCON for connected players. Returns list of dicts with name and optional steam_id."""
    plugin = get_plugin(server.game_type)
    password = decrypt_rcon_password(server.rcon_password_encrypted)
    try:
        await plugin.connect(server.host, server.rcon_port, password, server_id=server.id)
        players = await plugin.get_players()
        return [p for p in players if p.get("name")]
    except Exception as e:
        logger.debug("Failed to get players for server %s: %s", server.id, e)
        return []
    finally:
        try:
            await plugin.disconnect()
        except Exception:
            pass


async def _ensure_known_player(
    db: AsyncSession, name: str, now: datetime, steam_id: Optional[str] = None,
) -> KnownPlayer:
    """Get or create a KnownPlayer record."""
    result = await db.execute(select(KnownPlayer).where(KnownPlayer.name == name))
    player = result.scalar_one_or_none()
    if player is None:
        player = KnownPlayer(name=name, first_seen=now, last_seen=now, steam_id=steam_id)
        db.add(player)
        await db.flush()
        # Add initial name history
        name_entry = PlayerNameHistory(
            player_id=player.id, name=name,
            first_seen_with_name=now, last_seen_with_name=now,
        )
        db.add(name_entry)
    else:
        player.last_seen = now
        # Update steam_id if we now have one and didn't before
        if steam_id and not player.steam_id:
            player.steam_id = steam_id
        # Update name history
        nh_result = await db.execute(
            select(PlayerNameHistory).where(
                PlayerNameHistory.player_id == player.id,
                PlayerNameHistory.name == name,
            )
        )
        nh = nh_result.scalar_one_or_none()
        if nh:
            nh.last_seen_with_name = now
        else:
            db.add(PlayerNameHistory(
                player_id=player.id, name=name,
                first_seen_with_name=now, last_seen_with_name=now,
            ))
    return player


async def _check_ban_list_enforcement(db: AsyncSession, name: str, server_id: int, server: Server) -> None:
    """Check if player is on an auto-enforced ban list and kick/ban them if so."""
    from app.services.ban_list_service import ban_list_service
    try:
        entry = await ban_list_service.check_player(db, name, server_id)
        if entry:
            logger.info("Ban list enforcement: %s is on ban list, kicking from server %s", name, server_id)
            plugin = get_plugin(server.game_type)
            password = decrypt_rcon_password(server.rcon_password_encrypted)
            try:
                await plugin.connect(server.host, server.rcon_port, password, server_id=server_id)
                await plugin.ban_player(
                    lambda cmd: None,
                    name,
                    entry.reason or "Banned via ban list",
                )
            finally:
                try:
                    await plugin.disconnect()
                except Exception:
                    pass
    except Exception as e:
        logger.warning("Ban list check failed for %s on server %s: %s", name, server_id, e)


async def _check_steam_vac(db: AsyncSession, player: KnownPlayer, server_id: int) -> None:
    """Check Steam VAC/ban status for a player. No-op if no API key or no steam_id."""
    if not settings.STEAM_API_KEY or not player.steam_id:
        return

    from app.services.steam import get_player_summary
    try:
        info = await get_player_summary(player.steam_id, settings.STEAM_API_KEY)
        if not info:
            return

        now = datetime.now(timezone.utc)
        player.vac_banned = info.vac_banned
        player.vac_ban_count = info.number_of_vac_bans
        player.days_since_last_ban = info.days_since_last_ban
        player.game_banned = info.game_banned
        player.steam_profile_visibility = info.profile_visibility
        player.steam_avatar_url = info.avatar_url
        player.steam_persona_name = info.persona_name
        player.steam_checked_at = now

        if info.vac_banned or info.game_banned:
            logger.warning(
                "VAC/game ban detected for %s (steam:%s): %d VAC bans, game_banned=%s",
                player.name, player.steam_id, info.number_of_vac_bans, info.game_banned,
            )
            # Log to activity log
            from app.models.activity_log import ActivityLog
            db.add(ActivityLog(
                server_id=server_id,
                action="VAC_BAN_DETECTED",
                detail=f"Player {player.name} (Steam: {player.steam_id}) — "
                       f"{info.number_of_vac_bans} VAC ban(s), "
                       f"game banned: {info.game_banned}, "
                       f"days since last ban: {info.days_since_last_ban}",
            ))

            # Fire trigger event
            from app.services.trigger_engine import fire_event
            try:
                await fire_event("vac_ban_detected", server_id, {
                    "player_name": player.name,
                    "steam_id": player.steam_id,
                    "vac_ban_count": info.number_of_vac_bans,
                    "game_banned": info.game_banned,
                    "days_since_last_ban": info.days_since_last_ban,
                })
            except Exception:
                pass
    except Exception as e:
        logger.warning("Steam VAC check failed for %s: %s", player.name, e)


async def _check_shared_ip(db: AsyncSession, player: KnownPlayer) -> None:
    """Detect alt accounts sharing the same IP address."""
    # Get the player's most recent session IP
    sess_result = await db.execute(
        select(PlayerSession).where(
            PlayerSession.player_id == player.id,
            PlayerSession.ip_address.isnot(None),
        ).order_by(PlayerSession.joined_at.desc()).limit(1)
    )
    session = sess_result.scalar_one_or_none()
    if not session or not session.ip_address:
        return

    # Find other players with sessions from the same IP
    alt_result = await db.execute(
        select(PlayerSession.player_id).where(
            PlayerSession.ip_address == session.ip_address,
            PlayerSession.player_id != player.id,
        ).distinct()
    )
    alt_player_ids = [row[0] for row in alt_result.all()]

    if alt_player_ids:
        player.alt_account_ids = alt_player_ids
        logger.info(
            "Shared IP detected for %s: %d other account(s) from %s",
            player.name, len(alt_player_ids), session.ip_address,
        )

        # Update the other players' alt lists to include this player too
        other_result = await db.execute(
            select(KnownPlayer).where(KnownPlayer.id.in_(alt_player_ids))
        )
        for other in other_result.scalars():
            existing = other.alt_account_ids or []
            if player.id not in existing:
                other.alt_account_ids = existing + [player.id]


async def _handle_player_join(
    db: AsyncSession, name: str, server_id: int, now: datetime,
    steam_id: Optional[str] = None,
) -> None:
    """Player detected online — create/update KnownPlayer, open session."""
    player = await _ensure_known_player(db, name, now, steam_id=steam_id)
    player.session_count += 1

    session = PlayerSession(
        player_id=player.id,
        server_id=server_id,
        joined_at=now,
    )
    db.add(session)

    # Steam VAC check on join (non-blocking — failures are logged and swallowed)
    await _check_steam_vac(db, player, server_id)

    # Shared IP detection
    await _check_shared_ip(db, player)


async def _handle_player_leave(db: AsyncSession, name: str, server_id: int, now: datetime) -> None:
    """Player gone — close session, update playtime."""
    result = await db.execute(select(KnownPlayer).where(KnownPlayer.name == name))
    player = result.scalar_one_or_none()
    if not player:
        return

    # Find the open session for this player on this server
    sess_result = await db.execute(
        select(PlayerSession).where(
            PlayerSession.player_id == player.id,
            PlayerSession.server_id == server_id,
            PlayerSession.left_at.is_(None),
        ).order_by(PlayerSession.joined_at.desc()).limit(1)
    )
    session = sess_result.scalar_one_or_none()
    if session:
        session.left_at = now
        duration = int((now - session.joined_at).total_seconds())
        session.duration_seconds = max(duration, 0)
        player.total_playtime_seconds += session.duration_seconds

    player.last_seen = now


async def poll_players(ctx: dict = None) -> None:
    """Poll all servers for player changes. Called by ARQ cron every minute."""
    async with async_session() as db:
        try:
            result = await db.execute(select(Server))
            servers = result.scalars().all()
        except Exception as e:
            logger.error("Failed to query servers: %s", e)
            return

        now = datetime.now(timezone.utc)

        for server in servers:
            try:
                current_players = await _get_online_players(server)
                # Build name->steam_id map from RCON data
                steam_id_map: dict[str, Optional[str]] = {
                    p["name"]: p.get("steam_id") for p in current_players
                }
                current_names = set(steam_id_map.keys())

                # On first poll for this server, seed previous_names from open DB sessions
                # to avoid creating duplicate join events on worker restart.
                if server.id not in _server_players:
                    open_sessions = await db.execute(
                        select(PlayerSession)
                        .join(PlayerSession.player)
                        .where(
                            PlayerSession.server_id == server.id,
                            PlayerSession.left_at.is_(None),
                        )
                    )
                    seeded = {s.player.name for s in open_sessions.scalars().all() if s.player}
                    _server_players[server.id] = seeded
                    logger.debug("Seeded %d players for server %s from open sessions", len(seeded), server.id)

                previous_names = _server_players.get(server.id, set())

                joined = current_names - previous_names
                left = previous_names - current_names

                for name in joined:
                    await _handle_player_join(
                        db, name, server.id, now,
                        steam_id=steam_id_map.get(name),
                    )
                    await _check_ban_list_enforcement(db, name, server.id, server)

                for name in left:
                    await _handle_player_leave(db, name, server.id, now)

                # Send Discord webhook notifications for joins/leaves
                if joined or left:
                    from app.services.discord_webhooks import notify_player_join, notify_player_leave
                    from app.services.trigger_engine import fire_event
                    player_count = len(current_names)
                    for name in joined:
                        try:
                            await notify_player_join(server.id, server.name, server.game_type, name, player_count)
                        except Exception:
                            pass
                        try:
                            await fire_event("player_join", server.id, {"player_name": name, "server": server, "player_count": player_count})
                        except Exception:
                            pass
                        # Check player_count_above threshold on join
                        try:
                            await fire_event("player_count_above", server.id, {"player_count": player_count, "server": server})
                        except Exception:
                            pass
                    for name in left:
                        try:
                            await notify_player_leave(server.id, server.name, server.game_type, name, player_count)
                        except Exception:
                            pass
                        try:
                            await fire_event("player_leave", server.id, {"player_name": name, "server": server, "player_count": player_count})
                        except Exception:
                            pass
                        # Check player_count_below threshold on leave
                        try:
                            await fire_event("player_count_below", server.id, {"player_count": player_count, "server": server})
                        except Exception:
                            pass

                # Update last_seen for still-online players
                still_online = current_names & previous_names
                if still_online:
                    stmt = (
                        select(KnownPlayer)
                        .where(KnownPlayer.name.in_(still_online))
                    )
                    res = await db.execute(stmt)
                    for p in res.scalars():
                        p.last_seen = now

                _server_players[server.id] = current_names

                await db.commit()
            except Exception as e:
                logger.error("Error tracking players for server %s: %s", server.id, e)
                await db.rollback()


def get_online_players_snapshot() -> dict[int, set[str]]:
    """Return the current in-memory snapshot of online players per server."""
    return dict(_server_players)


def is_player_online(name: str) -> tuple[bool, int | None]:
    """Check if a player is currently online on any server. Returns (is_online, server_id)."""
    for server_id, names in _server_players.items():
        if name in names:
            return True, server_id
    return False, None
