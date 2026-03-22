"""Background service that polls game servers for events (kills, chat, etc.)
and stores them as GameEvent records."""

import logging
from datetime import datetime, timezone

from sqlalchemy import select, func

from app.auth.security import decrypt_rcon_password
from app.database import async_session
from app.models.game_event import GameEvent
from app.models.server import Server
from app.plugins.bridge import get_plugin

logger = logging.getLogger(__name__)

# Per-server: track the timestamp of the last event we stored so we can
# de-duplicate across polls.  Keyed by server_id.
_last_event_ts: dict[int, datetime] = {}


async def _poll_server_events(server_id: int) -> None:
    """Poll events from a single server and persist new ones. 20s timeout."""
    import asyncio
    try:
        await asyncio.wait_for(_poll_server_events_impl(server_id), timeout=20.0)
    except asyncio.TimeoutError:
        logger.warning("Event poll timeout for server %s", server_id)


async def _poll_server_events_impl(server_id: int) -> None:
    """Internal: poll events from a single server and persist new ones."""
    async with async_session() as db:
        result = await db.execute(select(Server).where(Server.id == server_id))
        server = result.scalar_one_or_none()
        if not server:
            return

        plugin = get_plugin(server.game_type)
        password = decrypt_rcon_password(server.rcon_password_encrypted)

        try:
            await plugin.connect(server.host, server.rcon_port, password, server_id=server.id)
            since = _last_event_ts.get(server_id)
            since_str = since.isoformat() if since else None
            events = await plugin.poll_events(since=since_str)
        except Exception as e:
            logger.warning("Event poll failed for server %s: %s", server_id, e)
            return
        finally:
            try:
                await plugin.disconnect()
            except Exception:
                pass

        if not events:
            return

        # De-duplicate: always check raw field against recent events to avoid
        # re-inserting the same log lines on worker restart.
        stmt = (
            select(GameEvent.raw)
            .where(GameEvent.server_id == server_id, GameEvent.raw.isnot(None))
            .order_by(GameEvent.created_at.desc())
            .limit(1000)
        )
        rows = await db.execute(stmt)
        existing_raws: set[str] = {r[0] for r in rows.all() if r[0]}

        now = datetime.now(timezone.utc)
        added = 0

        for ev in events:
            raw_val = ev.get("raw")
            if raw_val and raw_val in existing_raws:
                continue

            ts_str = ev.get("timestamp")
            try:
                ts = datetime.fromisoformat(ts_str) if ts_str else now
            except (ValueError, TypeError):
                ts = now

            game_event = GameEvent(
                server_id=server_id,
                event_type=ev.get("event_type", "unknown"),
                timestamp=ts,
                player_name=ev.get("player_name"),
                player_id=ev.get("player_id"),
                target_name=ev.get("target_name"),
                target_id=ev.get("target_id"),
                message=ev.get("message"),
                weapon=ev.get("weapon"),
                raw=raw_val,
            )
            db.add(game_event)
            added += 1

            # Also store chat events in ChatMessage for backward compat
            if ev.get("event_type") == "chat" and ev.get("message"):
                from app.models.chat_message import ChatMessage
                db.add(ChatMessage(
                    server_id=server_id,
                    player_name=ev.get("player_name", "Unknown"),
                    message=ev["message"],
                    timestamp=ts,
                ))
                # Fire chat_message trigger
                try:
                    from app.services.trigger_engine import fire_event
                    await fire_event("chat_message", server_id, {
                        "player_name": ev.get("player_name", "Unknown"),
                        "message": ev["message"],
                        "server": server,
                    })
                except Exception:
                    pass

        if added:
            await db.commit()
            _last_event_ts[server_id] = now
            logger.debug("Stored %d events for server %s", added, server_id)


async def poll_all_events(ctx: dict = None) -> None:
    """ARQ cron job: poll events for all servers."""
    async with async_session() as db:
        result = await db.execute(select(Server.id))
        server_ids = [row[0] for row in result.all()]

    for sid in server_ids:
        try:
            await _poll_server_events(sid)
        except Exception as e:
            logger.warning("Event poll error for server %s: %s", sid, e)
