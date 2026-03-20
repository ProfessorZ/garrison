"""API endpoints for game events (kills, chat, connects, etc.)."""

import logging

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from sqlalchemy import select, func, case, literal_column
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.auth.permissions import require_server_access
from app.database import get_db
from app.models.game_event import GameEvent
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/servers", tags=["events"])


class GameEventOut(BaseModel):
    id: int
    server_id: int
    event_type: str
    timestamp: datetime
    player_name: Optional[str] = None
    player_id: Optional[str] = None
    target_name: Optional[str] = None
    target_id: Optional[str] = None
    message: Optional[str] = None
    weapon: Optional[str] = None

    model_config = {"from_attributes": True}


class PlayerKDStats(BaseModel):
    player_id: str
    player_name: str
    kills: int = 0
    deaths: int = 0
    teamkills: int = 0


@router.get("/{server_id}/events", response_model=list[GameEventOut])
async def get_events(
    server_id: int,
    type: str = Query("all", description="Event type filter: kill, chat, connect, disconnect, teamkill, kick, ban, all"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.VIEWER)),
):
    """Get game events for a server, optionally filtered by type."""
    q = select(GameEvent).where(GameEvent.server_id == server_id)

    if type != "all":
        q = q.where(GameEvent.event_type == type)

    q = q.order_by(GameEvent.timestamp.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{server_id}/events/stats", response_model=list[PlayerKDStats])
async def get_kill_stats(
    server_id: int,
    limit: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.VIEWER)),
):
    """Get kill/death leaderboard for a server."""
    # Kills per player
    kills_q = (
        select(
            GameEvent.player_id,
            GameEvent.player_name,
            func.count().label("kills"),
        )
        .where(
            GameEvent.server_id == server_id,
            GameEvent.event_type == "kill",
            GameEvent.player_id.isnot(None),
        )
        .group_by(GameEvent.player_id, GameEvent.player_name)
    )
    kills_result = await db.execute(kills_q)
    kills_map: dict[str, dict] = {}
    for row in kills_result.all():
        kills_map[row.player_id] = {
            "player_id": row.player_id,
            "player_name": row.player_name,
            "kills": row.kills,
            "deaths": 0,
            "teamkills": 0,
        }

    # Deaths per player (target_id)
    deaths_q = (
        select(
            GameEvent.target_id,
            func.count().label("deaths"),
        )
        .where(
            GameEvent.server_id == server_id,
            GameEvent.event_type.in_(["kill", "teamkill"]),
            GameEvent.target_id.isnot(None),
        )
        .group_by(GameEvent.target_id)
    )
    deaths_result = await db.execute(deaths_q)
    for row in deaths_result.all():
        if row.target_id in kills_map:
            kills_map[row.target_id]["deaths"] = row.deaths
        else:
            kills_map[row.target_id] = {
                "player_id": row.target_id,
                "player_name": row.target_id,  # fallback
                "kills": 0,
                "deaths": row.deaths,
                "teamkills": 0,
            }

    # Teamkills
    tk_q = (
        select(
            GameEvent.player_id,
            func.count().label("teamkills"),
        )
        .where(
            GameEvent.server_id == server_id,
            GameEvent.event_type == "teamkill",
            GameEvent.player_id.isnot(None),
        )
        .group_by(GameEvent.player_id)
    )
    tk_result = await db.execute(tk_q)
    for row in tk_result.all():
        if row.player_id in kills_map:
            kills_map[row.player_id]["teamkills"] = row.teamkills

    # Sort by kills desc
    stats = sorted(kills_map.values(), key=lambda x: x["kills"], reverse=True)
    return stats[:limit]


player_router = APIRouter(prefix="/api/players", tags=["events"])


@player_router.get("/{player_id}/combat-stats")
async def get_player_event_stats(
    player_id: str,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get kill/death stats for a specific player across all servers."""
    kills_q = select(func.count()).where(
        GameEvent.player_id == player_id,
        GameEvent.event_type == "kill",
    )
    deaths_q = select(func.count()).where(
        GameEvent.target_id == player_id,
        GameEvent.event_type.in_(["kill", "teamkill"]),
    )
    teamkills_q = select(func.count()).where(
        GameEvent.player_id == player_id,
        GameEvent.event_type == "teamkill",
    )

    kills = (await db.execute(kills_q)).scalar() or 0
    deaths = (await db.execute(deaths_q)).scalar() or 0
    teamkills = (await db.execute(teamkills_q)).scalar() or 0

    return {
        "player_id": player_id,
        "kills": kills,
        "deaths": deaths,
        "teamkills": teamkills,
    }
