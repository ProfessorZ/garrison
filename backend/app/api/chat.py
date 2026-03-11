import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.auth.security import decrypt_rcon_password
from app.database import get_db, async_session
from app.games.registry import get_plugin
from app.models.chat_message import ChatMessage
from app.models.server import Server
from app.models.user import User
from app.schemas.chat import ChatMessageOut

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/servers", tags=["chat"])


@router.get("/{server_id}/chat/log", response_model=list[ChatMessageOut])
async def get_chat_log(
    server_id: int,
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Get stored chat messages for a server (paginated)."""
    q = (
        select(ChatMessage)
        .where(ChatMessage.server_id == server_id)
        .order_by(ChatMessage.timestamp.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(q)
    return result.scalars().all()


async def poll_server_chat(server_id: int):
    """Background task: poll chat from a single server and store new messages."""
    async with async_session() as db:
        result = await db.execute(select(Server).where(Server.id == server_id))
        server = result.scalar_one_or_none()
        if not server:
            return

        plugin = get_plugin(server.game_type)
        password = decrypt_rcon_password(server.rcon_password_encrypted)
        try:
            await plugin.connect(server.host, server.rcon_port, password, server_id=server.id)
            messages = await plugin.get_chat()
        except Exception as e:
            logger.warning("Chat poll failed for server %s: %s", server_id, e)
            return
        finally:
            try:
                await plugin.disconnect()
            except Exception:
                pass

        if not messages:
            return

        for msg in messages:
            player = msg.get("player", msg.get("name", "Unknown"))
            text = msg.get("message", msg.get("text", ""))
            if not text:
                continue
            chat_msg = ChatMessage(
                server_id=server_id,
                player_name=player,
                message=text,
                timestamp=datetime.now(timezone.utc),
            )
            db.add(chat_msg)
        await db.commit()


async def poll_all_chat():
    """Background task: poll chat for all servers."""
    async with async_session() as db:
        result = await db.execute(select(Server.id))
        server_ids = [row[0] for row in result.all()]
    for sid in server_ids:
        try:
            await poll_server_chat(sid)
        except Exception as e:
            logger.warning("Chat poll error for server %s: %s", sid, e)
