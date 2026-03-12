import logging
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import decrypt_rcon_password
from app.database import async_session
from app.plugins.bridge import get_plugin
from app.models.known_player import KnownPlayer
from app.models.player_session import PlayerSession
from app.models.player_name import PlayerNameHistory
from app.models.server import Server

logger = logging.getLogger(__name__)

# In-memory state: {server_id: set(player_names)}
_server_players: dict[int, set[str]] = {}


async def _get_online_players(server: Server) -> list[str]:
    """Query RCON for connected player names."""
    plugin = get_plugin(server.game_type)
    password = decrypt_rcon_password(server.rcon_password_encrypted)
    try:
        await plugin.connect(server.host, server.rcon_port, password, server_id=server.id)
        players = await plugin.get_players()
        return [p["name"] for p in players if p.get("name")]
    except Exception as e:
        logger.debug("Failed to get players for server %s: %s", server.id, e)
        return []
    finally:
        try:
            await plugin.disconnect()
        except Exception:
            pass


async def _ensure_known_player(db: AsyncSession, name: str, now: datetime) -> KnownPlayer:
    """Get or create a KnownPlayer record."""
    result = await db.execute(select(KnownPlayer).where(KnownPlayer.name == name))
    player = result.scalar_one_or_none()
    if player is None:
        player = KnownPlayer(name=name, first_seen=now, last_seen=now)
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


async def _handle_player_join(db: AsyncSession, name: str, server_id: int, now: datetime) -> None:
    """Player detected online — create/update KnownPlayer, open session."""
    player = await _ensure_known_player(db, name, now)
    player.session_count += 1

    session = PlayerSession(
        player_id=player.id,
        server_id=server_id,
        joined_at=now,
    )
    db.add(session)


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


async def poll_players() -> None:
    """Poll all servers for player changes. Called by APScheduler every 15s."""
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
                current_names = set(await _get_online_players(server))
                previous_names = _server_players.get(server.id, set())

                joined = current_names - previous_names
                left = previous_names - current_names

                for name in joined:
                    await _handle_player_join(db, name, server.id, now)

                for name in left:
                    await _handle_player_leave(db, name, server.id, now)

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
