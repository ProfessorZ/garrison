from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.activity_log import ActivityLog
from app.models.known_player import KnownPlayer
from app.models.server import Server
from app.models.user import User
from app.schemas.activity import ActivityLogOut
from app.schemas.dashboard import DashboardStats, DashboardServer
from app.api.activity import _to_out

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def dashboard_stats(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    total = (await db.execute(select(func.count(Server.id)))).scalar() or 0
    online = (
        await db.execute(
            select(func.count(Server.id)).where(Server.last_status == True)  # noqa: E712
        )
    ).scalar() or 0
    players = (
        await db.execute(
            select(func.coalesce(func.sum(Server.player_count), 0)).where(
                Server.last_status == True  # noqa: E712
            )
        )
    ).scalar() or 0

    known = (await db.execute(select(func.count(KnownPlayer.id)))).scalar() or 0

    recent_q = select(ActivityLog).order_by(ActivityLog.created_at.desc()).limit(10)
    recent_rows = (await db.execute(recent_q)).scalars().all()

    return DashboardStats(
        total_servers=total,
        online_servers=online,
        total_players=players,
        known_players=known,
        recent_activity=[_to_out(r) for r in recent_rows],
    )


@router.get("/servers", response_model=list[DashboardServer])
async def dashboard_servers(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Server).order_by(Server.name))
    return result.scalars().all()
