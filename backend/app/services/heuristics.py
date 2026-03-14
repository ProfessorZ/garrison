import logging
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from statistics import median

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.server_metric import ServerMetric

logger = logging.getLogger(__name__)


@dataclass
class ServerHeuristics:
    peak_hours: list[int]  # hours 0-23 UTC with highest avg players
    trend: str  # "growing" | "declining" | "stable"
    trend_percent: float  # % change over 7 days
    uptime_7d: float  # 0.0–1.0
    median_players: float
    is_healthy: bool


async def compute_heuristics(db: AsyncSession, server_id: int) -> ServerHeuristics:
    now = datetime.now(timezone.utc)

    # Get 7 days of metrics
    since_7d = now - timedelta(days=7)
    result = await db.execute(
        select(ServerMetric)
        .where(ServerMetric.server_id == server_id, ServerMetric.recorded_at >= since_7d)
        .order_by(ServerMetric.recorded_at.asc())
    )
    rows = result.scalars().all()

    if not rows:
        return ServerHeuristics(
            peak_hours=[],
            trend="stable",
            trend_percent=0.0,
            uptime_7d=0.0,
            median_players=0.0,
            is_healthy=False,
        )

    # --- Uptime ---
    online_count = sum(1 for r in rows if r.is_online)
    uptime_7d = online_count / len(rows)

    # --- Peak hours ---
    # Group player counts by hour of day
    hour_totals: dict[int, list[int]] = {h: [] for h in range(24)}
    for r in rows:
        if r.is_online:
            hour_totals[r.recorded_at.hour].append(r.player_count)

    hour_avgs = {}
    for h, counts in hour_totals.items():
        if counts:
            hour_avgs[h] = sum(counts) / len(counts)

    if hour_avgs:
        max_avg = max(hour_avgs.values())
        threshold = max_avg * 0.7 if max_avg > 0 else 0
        peak_hours = sorted(h for h, avg in hour_avgs.items() if avg >= threshold)
    else:
        peak_hours = []

    # --- Player trend (first half vs second half of 7 days) ---
    mid = len(rows) // 2
    first_half = rows[:mid]
    second_half = rows[mid:]

    avg_first = sum(r.player_count for r in first_half) / len(first_half) if first_half else 0
    avg_second = sum(r.player_count for r in second_half) / len(second_half) if second_half else 0

    if avg_first > 0:
        trend_percent = ((avg_second - avg_first) / avg_first) * 100
    elif avg_second > 0:
        trend_percent = 100.0
    else:
        trend_percent = 0.0

    if trend_percent > 10:
        trend = "growing"
    elif trend_percent < -10:
        trend = "declining"
    else:
        trend = "stable"

    # --- Median players during active hours ---
    active_counts = [r.player_count for r in rows if r.is_online and r.player_count > 0]
    median_players = float(median(active_counts)) if active_counts else 0.0

    # --- Health: online > 80% and not declining significantly ---
    is_healthy = uptime_7d >= 0.8 and trend != "declining"

    return ServerHeuristics(
        peak_hours=peak_hours,
        trend=trend,
        trend_percent=round(trend_percent, 1),
        uptime_7d=round(uptime_7d, 4),
        median_players=round(median_players, 1),
        is_healthy=is_healthy,
    )
