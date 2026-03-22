"""Watch plugin directories and restart the worker process on changes."""
import asyncio
import logging
import os
import signal
from pathlib import Path

logger = logging.getLogger(__name__)

WATCH_DIRS = [
    Path(__file__).parent / "plugins",
    Path("/data/plugins"),  # Docker mount path for external plugins
]


async def watch_plugins(worker_pid: int):
    """Poll plugin directories for changes and SIGTERM the worker on change."""

    def snapshot() -> dict[Path, float]:
        result = {}
        for watch_dir in WATCH_DIRS:
            if not watch_dir.exists():
                continue
            for f in watch_dir.rglob("*.py"):
                result[f] = f.stat().st_mtime
        return result

    seen = snapshot()
    logger.info("Plugin watcher started, monitoring %d files", len(seen))

    while True:
        await asyncio.sleep(5)
        current = snapshot()

        added = set(current) - set(seen)
        removed = set(seen) - set(current)
        changed = {p for p in current.keys() & seen.keys() if current[p] != seen[p]}

        if added or removed or changed:
            logger.info(
                "Plugin change detected: +%d -%d ~%d — restarting worker",
                len(added), len(removed), len(changed),
            )
            os.kill(worker_pid, signal.SIGTERM)
            return

        seen = current
