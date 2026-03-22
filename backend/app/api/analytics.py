"""Game analytics derived from game_events table."""

from collections import Counter
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.permissions import require_server_access
from app.database import get_db
from app.models.game_event import GameEvent
from app.models.user import UserRole

router = APIRouter(prefix="/api/servers", tags=["analytics"])


def _cutoff(period: str):
    if period == "7d":
        return datetime.now(timezone.utc) - timedelta(days=7)
    if period == "30d":
        return datetime.now(timezone.utc) - timedelta(days=30)
    return None


@router.get("/{server_id}/analytics/kills")
async def kill_stats(
    server_id: int,
    period: str = "7d",
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_server_access(UserRole.VIEWER)),
):
    """Top killers, top weapons, kill counts."""
    cutoff = _cutoff(period)

    q = select(GameEvent).where(
        GameEvent.server_id == server_id,
        GameEvent.event_type.in_(["kill", "teamkill"]),
    )
    if cutoff:
        q = q.where(GameEvent.created_at >= cutoff)

    result = await db.execute(q)
    events = result.scalars().all()

    killer_counts: Counter[str] = Counter()
    weapon_counts: Counter[str] = Counter()
    teamkill_counts: Counter[str] = Counter()
    victim_counts: Counter[str] = Counter()

    for e in events:
        if e.event_type == "kill":
            if e.player_name:
                killer_counts[e.player_name] += 1
            if e.weapon:
                weapon_counts[e.weapon] += 1
            if e.target_name:
                victim_counts[e.target_name] += 1
        elif e.event_type == "teamkill":
            if e.player_name:
                teamkill_counts[e.player_name] += 1

    return {
        "period": period,
        "total_kills": sum(killer_counts.values()),
        "total_teamkills": sum(teamkill_counts.values()),
        "top_killers": [{"name": n, "kills": c} for n, c in killer_counts.most_common(10)],
        "top_weapons": [{"weapon": w, "kills": c} for w, c in weapon_counts.most_common(10)],
        "most_killed": [{"name": n, "deaths": c} for n, c in victim_counts.most_common(10)],
        "teamkillers": [{"name": n, "teamkills": c} for n, c in teamkill_counts.most_common(10)],
    }


@router.get("/{server_id}/analytics/maps")
async def map_stats(
    server_id: int,
    period: str = "7d",
    db: AsyncSession = Depends(get_db),
    _user=Depends(require_server_access(UserRole.VIEWER)),
):
    """Map play frequency."""
    cutoff = _cutoff(period)

    q = select(GameEvent).where(
        GameEvent.server_id == server_id,
        GameEvent.event_type == "map_change",
    )
    if cutoff:
        q = q.where(GameEvent.created_at >= cutoff)

    result = await db.execute(q)
    events = result.scalars().all()

    map_counts: Counter[str] = Counter()
    for e in events:
        # map_change events store map name in the message field
        name = e.message or e.raw
        if name:
            map_counts[name] += 1

    return {
        "period": period,
        "maps_played": [{"map": m, "times_played": c} for m, c in map_counts.most_common(20)],
    }
