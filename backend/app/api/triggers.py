import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.auth.permissions import require_role, require_server_access
from app.database import get_db
from app.models.trigger import Trigger
from app.models.server import Server
from app.models.user import User, UserRole
from app.services.trigger_engine import test_trigger

logger = logging.getLogger(__name__)


# ── Schemas ────────────────────────────────────────────────────────────────

VALID_EVENT_TYPES = [
    "player_join", "player_leave",
    "player_count_above", "player_count_below",
    "server_online", "server_offline",
    "chat_message",
]

VALID_ACTION_TYPES = [
    "rcon_command", "discord_webhook", "kick_player", "ban_player",
]


class TriggerCreate(BaseModel):
    server_id: Optional[int] = None
    name: str
    description: Optional[str] = None
    event_type: str
    event_config: Optional[dict] = None
    action_type: str
    action_config: Optional[dict] = None
    condition: Optional[dict] = None
    cooldown_seconds: int = 0
    is_active: bool = True


class TriggerUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    event_type: Optional[str] = None
    event_config: Optional[dict] = None
    action_type: Optional[str] = None
    action_config: Optional[dict] = None
    condition: Optional[dict] = None
    cooldown_seconds: Optional[int] = None
    is_active: Optional[bool] = None


class TriggerOut(BaseModel):
    id: int
    server_id: Optional[int]
    server_name: Optional[str] = None
    name: str
    description: Optional[str]
    is_active: bool
    event_type: str
    event_config: Optional[dict]
    action_type: str
    action_config: Optional[dict]
    condition: Optional[dict]
    cooldown_seconds: int
    last_fired_at: Optional[str] = None
    fire_count: int
    created_by_user_id: Optional[int]
    created_by_username: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}


def _to_out(t: Trigger) -> TriggerOut:
    return TriggerOut(
        id=t.id,
        server_id=t.server_id,
        server_name=t.server.name if t.server else None,
        name=t.name,
        description=t.description,
        is_active=t.is_active,
        event_type=t.event_type,
        event_config=t.event_config,
        action_type=t.action_type,
        action_config=t.action_config,
        condition=t.condition,
        cooldown_seconds=t.cooldown_seconds,
        last_fired_at=t.last_fired_at.isoformat() if t.last_fired_at else None,
        fire_count=t.fire_count or 0,
        created_by_user_id=t.created_by_user_id,
        created_by_username=t.created_by.username if t.created_by else None,
        created_at=t.created_at.isoformat() if t.created_at else None,
        updated_at=t.updated_at.isoformat() if t.updated_at else None,
    )


# ── Router ─────────────────────────────────────────────────────────────────

router = APIRouter(prefix="/api", tags=["triggers"])


@router.get("/triggers", response_model=list[TriggerOut])
async def list_triggers(
    server_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.MODERATOR)),
):
    q = select(Trigger).order_by(Trigger.created_at.desc())
    if server_id is not None:
        q = q.where(
            (Trigger.server_id == server_id) | (Trigger.server_id.is_(None))
        )
    result = await db.execute(q)
    return [_to_out(t) for t in result.scalars().all()]


@router.get("/servers/{server_id}/triggers", response_model=list[TriggerOut])
async def list_server_triggers(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    result = await db.execute(
        select(Trigger).where(
            (Trigger.server_id == server_id) | (Trigger.server_id.is_(None))
        ).order_by(Trigger.created_at.desc())
    )
    return [_to_out(t) for t in result.scalars().all()]


@router.post("/triggers", response_model=TriggerOut, status_code=status.HTTP_201_CREATED)
async def create_trigger(
    data: TriggerCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_role(UserRole.ADMIN)),
):
    if data.event_type not in VALID_EVENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid event_type: {data.event_type}")
    if data.action_type not in VALID_ACTION_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid action_type: {data.action_type}")

    if data.server_id is not None:
        result = await db.execute(select(Server).where(Server.id == data.server_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Server not found")

    trigger = Trigger(
        server_id=data.server_id,
        name=data.name,
        description=data.description,
        event_type=data.event_type,
        event_config=data.event_config or {},
        action_type=data.action_type,
        action_config=data.action_config or {},
        condition=data.condition,
        cooldown_seconds=data.cooldown_seconds,
        is_active=data.is_active,
        created_by_user_id=user.id,
    )
    db.add(trigger)
    await db.commit()
    await db.refresh(trigger)
    return _to_out(trigger)


@router.put("/triggers/{trigger_id}", response_model=TriggerOut)
async def update_trigger(
    trigger_id: int,
    data: TriggerUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(Trigger).where(Trigger.id == trigger_id))
    trigger = result.scalar_one_or_none()
    if not trigger:
        raise HTTPException(status_code=404, detail="Trigger not found")

    update_data = data.model_dump(exclude_unset=True)
    if "event_type" in update_data and update_data["event_type"] not in VALID_EVENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid event_type: {update_data['event_type']}")
    if "action_type" in update_data and update_data["action_type"] not in VALID_ACTION_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid action_type: {update_data['action_type']}")

    for key, value in update_data.items():
        setattr(trigger, key, value)

    await db.commit()
    await db.refresh(trigger)
    return _to_out(trigger)


@router.delete("/triggers/{trigger_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trigger(
    trigger_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(Trigger).where(Trigger.id == trigger_id))
    trigger = result.scalar_one_or_none()
    if not trigger:
        raise HTTPException(status_code=404, detail="Trigger not found")
    await db.delete(trigger)
    await db.commit()


@router.post("/triggers/{trigger_id}/toggle", response_model=TriggerOut)
async def toggle_trigger(
    trigger_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(Trigger).where(Trigger.id == trigger_id))
    trigger = result.scalar_one_or_none()
    if not trigger:
        raise HTTPException(status_code=404, detail="Trigger not found")
    trigger.is_active = not trigger.is_active
    await db.commit()
    await db.refresh(trigger)
    return _to_out(trigger)


@router.post("/triggers/{trigger_id}/test")
async def test_trigger_endpoint(
    trigger_id: int,
    _user: User = Depends(require_role(UserRole.ADMIN)),
):
    result_text = await test_trigger(trigger_id)
    return {"status": "ok", "result": result_text}
