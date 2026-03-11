from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.activity_log import ActivityLog, ActionType
from app.models.user import User
from app.schemas.activity import ActivityLogOut

router = APIRouter(prefix="/api", tags=["activity"])


def _to_out(log: ActivityLog) -> ActivityLogOut:
    return ActivityLogOut(
        id=log.id,
        server_id=log.server_id,
        user_id=log.user_id,
        action=log.action,
        detail=log.detail or "",
        created_at=log.created_at,
        server_name=log.server.name if log.server else None,
        username=log.user.username if log.user else None,
    )


async def log_activity(
    db: AsyncSession,
    *,
    server_id: Optional[int] = None,
    user_id: Optional[int] = None,
    action: ActionType,
    detail: str = "",
) -> ActivityLog:
    """Helper: insert an activity log row."""
    entry = ActivityLog(
        server_id=server_id,
        user_id=user_id,
        action=action,
        detail=detail,
    )
    db.add(entry)
    await db.flush()
    return entry


@router.get("/activity", response_model=list[ActivityLogOut])
async def list_activity(
    server_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    action: Optional[ActionType] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = select(ActivityLog)
    if server_id is not None:
        q = q.where(ActivityLog.server_id == server_id)
    if user_id is not None:
        q = q.where(ActivityLog.user_id == user_id)
    if action is not None:
        q = q.where(ActivityLog.action == action)
    q = q.order_by(ActivityLog.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(q)
    return [_to_out(row) for row in result.scalars().all()]


@router.get("/servers/{server_id}/activity", response_model=list[ActivityLogOut])
async def server_activity(
    server_id: int,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    q = (
        select(ActivityLog)
        .where(ActivityLog.server_id == server_id)
        .order_by(ActivityLog.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(q)
    return [_to_out(row) for row in result.scalars().all()]
