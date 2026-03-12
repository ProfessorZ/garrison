import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.permissions import require_role
from app.auth.security import encrypt_rcon_password, decrypt_rcon_password
from app.database import get_db
from app.models.server_webhook import ServerWebhook
from app.models.user import User, UserRole
from app.services.discord_webhooks import send_test_webhook

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["webhooks"])

VALID_EVENTS = [
    "server_online", "server_offline",
    "player_join", "player_leave",
    "player_kick", "player_ban",
    "scheduled_command", "server_error",
]


class WebhookCreate(BaseModel):
    server_id: Optional[int] = None
    webhook_url: str
    events: list[str] = VALID_EVENTS.copy()
    is_active: bool = True


class WebhookUpdate(BaseModel):
    webhook_url: Optional[str] = None
    events: Optional[list[str]] = None
    is_active: Optional[bool] = None


class WebhookOut(BaseModel):
    id: int
    server_id: Optional[int]
    server_name: Optional[str] = None
    webhook_url_preview: str
    events: list[str]
    is_active: bool
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}


def _to_out(wh: ServerWebhook) -> WebhookOut:
    try:
        url = decrypt_rcon_password(wh.webhook_url_encrypted)
        # Show last 8 chars for identification
        preview = f"...{url[-8:]}" if len(url) > 8 else url
    except Exception:
        preview = "(decryption failed)"

    try:
        events = json.loads(wh.events) if isinstance(wh.events, str) else wh.events
    except (json.JSONDecodeError, TypeError):
        events = []

    return WebhookOut(
        id=wh.id,
        server_id=wh.server_id,
        server_name=wh.server.name if wh.server else None,
        webhook_url_preview=preview,
        events=events,
        is_active=wh.is_active,
        created_at=wh.created_at.isoformat() if wh.created_at else None,
        updated_at=wh.updated_at.isoformat() if wh.updated_at else None,
    )


@router.get("/webhooks", response_model=list[WebhookOut])
async def list_webhooks(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(
        select(ServerWebhook).order_by(ServerWebhook.created_at.desc())
    )
    return [_to_out(wh) for wh in result.scalars().all()]


@router.get("/servers/{server_id}/webhooks", response_model=list[WebhookOut])
async def list_server_webhooks(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(
        select(ServerWebhook).where(
            (ServerWebhook.server_id == server_id) | (ServerWebhook.server_id.is_(None))
        ).order_by(ServerWebhook.created_at.desc())
    )
    return [_to_out(wh) for wh in result.scalars().all()]


@router.post("/webhooks", response_model=WebhookOut, status_code=status.HTTP_201_CREATED)
async def create_webhook(
    data: WebhookCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.ADMIN)),
):
    # Validate events
    invalid = [e for e in data.events if e not in VALID_EVENTS]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid events: {invalid}")

    wh = ServerWebhook(
        server_id=data.server_id,
        webhook_url_encrypted=encrypt_rcon_password(data.webhook_url),
        events=json.dumps(data.events),
        is_active=data.is_active,
    )
    db.add(wh)
    await db.commit()
    await db.refresh(wh)
    return _to_out(wh)


@router.put("/webhooks/{webhook_id}", response_model=WebhookOut)
async def update_webhook(
    webhook_id: int,
    data: WebhookUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(ServerWebhook).where(ServerWebhook.id == webhook_id))
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")

    if data.webhook_url is not None:
        wh.webhook_url_encrypted = encrypt_rcon_password(data.webhook_url)
    if data.events is not None:
        invalid = [e for e in data.events if e not in VALID_EVENTS]
        if invalid:
            raise HTTPException(status_code=400, detail=f"Invalid events: {invalid}")
        wh.events = json.dumps(data.events)
    if data.is_active is not None:
        wh.is_active = data.is_active

    await db.commit()
    await db.refresh(wh)
    return _to_out(wh)


@router.delete("/webhooks/{webhook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webhook(
    webhook_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(ServerWebhook).where(ServerWebhook.id == webhook_id))
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")
    await db.delete(wh)
    await db.commit()


@router.post("/webhooks/{webhook_id}/test")
async def test_webhook(
    webhook_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(ServerWebhook).where(ServerWebhook.id == webhook_id))
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Webhook not found")

    try:
        url = decrypt_rcon_password(wh.webhook_url_encrypted)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt webhook URL")

    success = await send_test_webhook(url)
    if success:
        return {"status": "ok", "message": "Test message sent successfully"}
    raise HTTPException(status_code=502, detail="Failed to send test message to Discord")


@router.get("/discord/bot-status")
async def bot_status(
    _user: User = Depends(require_role(UserRole.VIEWER)),
):
    """Get the Discord bot connection status."""
    from app.services.discord_bot import get_bot

    bot = get_bot()
    if bot is None:
        return {
            "connected": False,
            "guild_name": None,
            "command_count": 0,
            "bot_username": None,
        }

    return {
        "connected": bot.is_ready_and_connected,
        "guild_name": bot.guild_name,
        "command_count": bot.command_count,
        "bot_username": str(bot.user) if bot.user else None,
    }
