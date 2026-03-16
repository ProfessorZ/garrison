import logging
import time
from datetime import datetime, timezone, timedelta

from sqlalchemy import select, delete

from app.auth.security import decrypt_rcon_password
from app.database import async_session
from app.models.server import Server
from app.models.server_metric import ServerMetric
from app.plugins.bridge import get_plugin

logger = logging.getLogger(__name__)

RETENTION_DAYS = 30


async def collect_metrics(ctx: dict = None) -> None:
    """Collect server metrics every 5 minutes. Called by ARQ cron."""
    async with async_session() as db:
        try:
            result = await db.execute(select(Server))
            servers = result.scalars().all()
        except Exception as e:
            logger.error("Failed to query servers for metrics: %s", e)
            return

        now = datetime.now(timezone.utc)

        for server in servers:
            try:
                plugin = get_plugin(server.game_type)
                password = decrypt_rcon_password(server.rcon_password_encrypted)

                start_ms = time.monotonic_ns()
                try:
                    await plugin.connect(server.host, server.rcon_port, password, server_id=server.id)
                    status_info = await plugin.get_status()
                finally:
                    try:
                        await plugin.disconnect()
                    except Exception:
                        pass
                elapsed_ms = int((time.monotonic_ns() - start_ms) / 1_000_000)

                is_online = status_info.get("online", False)
                player_count = status_info.get("player_count", 0) or 0

                metric = ServerMetric(
                    server_id=server.id,
                    recorded_at=now,
                    player_count=player_count if is_online else 0,
                    is_online=is_online,
                    response_time_ms=elapsed_ms,
                )
                db.add(metric)

            except Exception as e:
                logger.debug("Metrics collection failed for server %s: %s", server.id, e)
                metric = ServerMetric(
                    server_id=server.id,
                    recorded_at=now,
                    player_count=0,
                    is_online=False,
                    response_time_ms=None,
                )
                db.add(metric)

        # Prune old records
        cutoff = now - timedelta(days=RETENTION_DAYS)
        await db.execute(
            delete(ServerMetric).where(ServerMetric.recorded_at < cutoff)
        )

        try:
            await db.commit()
        except Exception as e:
            logger.error("Failed to commit metrics: %s", e)
            await db.rollback()
