"""Distributed lock for ARQ cron jobs using Redis SET NX EX."""
import functools
import logging
from typing import Callable

logger = logging.getLogger(__name__)


def with_lock(lock_name: str, ttl_seconds: int = 55):
    """Decorator: skip the cron job if another worker holds the lock."""

    def decorator(fn: Callable):
        @functools.wraps(fn)
        async def wrapper(ctx, *args, **kwargs):
            redis = ctx["redis"]
            key = f"garrison:lock:{lock_name}"
            acquired = await redis.set(key, "1", nx=True, ex=ttl_seconds)
            if not acquired:
                logger.debug("Lock %s held by another worker, skipping", lock_name)
                return
            try:
                return await fn(ctx, *args, **kwargs)
            finally:
                await redis.delete(key)

        return wrapper

    return decorator
