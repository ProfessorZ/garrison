import logging
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.auth.permissions import require_server_access
from app.database import get_db
from app.models.server_metric import ServerMetric
from app.models.server import Server
from app.models.user import User, UserRole
from app.schemas.metrics import MetricPoint, MetricsSummary, DashboardMetrics, ServerHeuristicsOut
from app.services.heuristics import compute_heuristics

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["metrics"])

PERIOD_MAP = {
    "24h": timedelta(hours=24),
    "7d": timedelta(days=7),
    "30d": timedelta(days=30),
}

MAX_POINTS = 200


def _downsample(points: list[MetricPoint], max_points: int) -> list[MetricPoint]:
    if len(points) <= max_points:
        return points
    step = len(points) / max_points
    result = []
    i = 0.0
    while int(i) < len(points):
        result.append(points[int(i)])
        i += step
    return result


@router.get("/servers/{server_id}/metrics", response_model=list[MetricPoint])
async def get_server_metrics(
    server_id: int,
    period: str = Query("24h", pattern="^(24h|7d|30d)$"),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.VIEWER)),
):
    delta = PERIOD_MAP[period]
    since = datetime.now(timezone.utc) - delta

    result = await db.execute(
        select(ServerMetric)
        .where(ServerMetric.server_id == server_id, ServerMetric.recorded_at >= since)
        .order_by(ServerMetric.recorded_at.asc())
    )
    rows = result.scalars().all()

    points = [
        MetricPoint(
            timestamp=r.recorded_at,
            player_count=r.player_count,
            is_online=r.is_online,
            response_time_ms=r.response_time_ms,
        )
        for r in rows
    ]
    return _downsample(points, MAX_POINTS)


@router.get("/servers/{server_id}/metrics/summary", response_model=MetricsSummary)
async def get_metrics_summary(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.VIEWER)),
):
    now = datetime.now(timezone.utc)

    async def _stats(delta: timedelta):
        since = now - delta
        result = await db.execute(
            select(ServerMetric)
            .where(ServerMetric.server_id == server_id, ServerMetric.recorded_at >= since)
            .order_by(ServerMetric.recorded_at.asc())
        )
        rows = result.scalars().all()
        if not rows:
            return 0.0, 0, 0.0

        online_count = sum(1 for r in rows if r.is_online)
        uptime = online_count / len(rows) if rows else 0.0
        peak = max(r.player_count for r in rows)
        avg = sum(r.player_count for r in rows) / len(rows)
        return uptime, peak, avg

    uptime_24h, peak_24h, avg_24h = await _stats(timedelta(hours=24))
    uptime_7d, peak_7d, avg_7d = await _stats(timedelta(days=7))
    uptime_30d, peak_30d, avg_30d = await _stats(timedelta(days=30))

    # Current streak: consecutive online readings from most recent backwards
    result = await db.execute(
        select(ServerMetric)
        .where(ServerMetric.server_id == server_id)
        .order_by(ServerMetric.recorded_at.desc())
        .limit(8640)  # 30 days of 5-min intervals
    )
    recent = result.scalars().all()
    streak_count = 0
    for r in recent:
        if r.is_online:
            streak_count += 1
        else:
            break
    streak_hours = (streak_count * 5) / 60.0

    return MetricsSummary(
        uptime_24h=round(uptime_24h, 4),
        uptime_7d=round(uptime_7d, 4),
        uptime_30d=round(uptime_30d, 4),
        peak_players_24h=peak_24h,
        peak_players_7d=peak_7d,
        peak_players_30d=peak_30d,
        avg_players_24h=round(avg_24h, 1),
        avg_players_7d=round(avg_7d, 1),
        avg_players_30d=round(avg_30d, 1),
        current_streak_hours=round(streak_hours, 1),
    )


@router.get("/dashboard/metrics", response_model=DashboardMetrics)
async def get_dashboard_metrics(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    since = datetime.now(timezone.utc) - timedelta(hours=24)

    result = await db.execute(
        select(ServerMetric).where(ServerMetric.recorded_at >= since)
    )
    rows = result.scalars().all()

    if not rows:
        return DashboardMetrics(total_player_hours_24h=0.0, combined_uptime_percent=0.0)

    # Each metric point represents a 5-minute interval
    total_player_hours = sum(r.player_count for r in rows) * (5 / 60.0)
    online_count = sum(1 for r in rows if r.is_online)
    combined_uptime = online_count / len(rows) if rows else 0.0

    return DashboardMetrics(
        total_player_hours_24h=round(total_player_hours, 1),
        combined_uptime_percent=round(combined_uptime, 4),
    )


@router.get("/servers/{server_id}/heuristics", response_model=ServerHeuristicsOut)
async def get_server_heuristics(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.VIEWER)),
):
    heuristics = await compute_heuristics(db, server_id)
    return ServerHeuristicsOut(
        peak_hours=heuristics.peak_hours,
        trend=heuristics.trend,
        trend_percent=heuristics.trend_percent,
        uptime_7d=heuristics.uptime_7d,
        median_players=heuristics.median_players,
        is_healthy=heuristics.is_healthy,
    )
