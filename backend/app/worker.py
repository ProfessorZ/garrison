"""ARQ worker configuration.

All background jobs that previously ran inside FastAPI via APScheduler
now run here as ARQ cron jobs in a separate process.

Note: ARQ cron minimum granularity is 1 minute.  poll_players previously
ran every 15 seconds — it now runs every minute.  This is an acceptable
tradeoff; sub-minute polling can be restored later using the ARQ
functions + self-re-enqueue pattern if needed.

Cron jobs use distributed Redis locks so that only one worker instance
runs each job when scaled horizontally (docker compose up --scale worker=N).
"""

import logging
from urllib.parse import urlparse

from arq import cron
from arq.connections import RedisSettings

from app.config import settings
from app.worker_lock import with_lock
from app.worker_startup import startup, shutdown

logging.basicConfig(level=logging.INFO)

# ── Job imports ──────────────────────────────────────────────────────────────

from app.services.player_tracker import poll_players as _poll_players
from app.services.metrics_collector import collect_metrics as _collect_metrics
from app.api.chat import poll_all_chat as _poll_all_chat
from app.api.servers import poll_all_servers as _poll_all_servers
from app.api.scheduler import run_due_scheduled_commands as _run_due_scheduled_commands
from app.services.event_poller import poll_all_events as _poll_all_events

# ── Locked cron wrappers (one execution per job across all workers) ──────────


@with_lock("poll_players", ttl_seconds=50)
async def poll_players(ctx):
    return await _poll_players(ctx)


@with_lock("collect_metrics", ttl_seconds=280)
async def collect_metrics(ctx):
    return await _collect_metrics(ctx)


@with_lock("poll_all_servers", ttl_seconds=50)
async def poll_all_servers(ctx):
    return await _poll_all_servers(ctx)


@with_lock("poll_all_chat", ttl_seconds=50)
async def poll_all_chat(ctx):
    return await _poll_all_chat(ctx)


@with_lock("run_due_scheduled_commands", ttl_seconds=50)
async def run_due_scheduled_commands(ctx):
    return await _run_due_scheduled_commands(ctx)


@with_lock("poll_all_events", ttl_seconds=50)
async def poll_all_events(ctx):
    return await _poll_all_events(ctx)


# ── Redis settings from URL ─────────────────────────────────────────────────

_parsed = urlparse(settings.REDIS_URL)
_redis_settings = RedisSettings(
    host=_parsed.hostname or "redis",
    port=_parsed.port or 6379,
    database=int(_parsed.path.lstrip("/") or 0) if _parsed.path and _parsed.path != "/" else 0,
    password=_parsed.password,
)

# ── Every-minute set (0–59) ──────────────────────────────────────────────────

_EVERY_MINUTE = set(range(60))
_EVERY_30_SEC = set(range(0, 60, 2))  # every even minute for ~30s effective interval
_EVERY_5_MIN = {0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55}


# ── Worker class ─────────────────────────────────────────────────────────────

class WorkerSettings:
    functions = []  # on-demand jobs (for future use)
    cron_jobs = [
        cron(poll_players, minute=_EVERY_MINUTE, second=0),
        cron(collect_metrics, minute=_EVERY_5_MIN, second=10),
        cron(poll_all_servers, minute=_EVERY_MINUTE, second=30),
        cron(poll_all_chat, minute=_EVERY_MINUTE, second=45),
        cron(run_due_scheduled_commands, minute=_EVERY_MINUTE, second=15),
        cron(poll_all_events, minute=_EVERY_MINUTE, second=50),
    ]
    redis_settings = _redis_settings
    on_startup = startup
    on_shutdown = shutdown
