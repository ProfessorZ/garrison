import asyncio
import json
import logging
import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import decode_access_token, decrypt_rcon_password
from app.auth.permissions import require_server_access
from app.database import get_db, async_session
from app.games.registry import get_plugin
from app.models.server import Server
from app.models.user import User, UserRole, ROLE_HIERARCHY
from app.models.server_permission import ServerPermission
from app.models.activity_log import ActionType
from app.schemas.server import CommandRequest, CommandResponse
from app.api.activity import log_activity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["console"])

# In-memory command history: server_id -> deque of {command, output, timestamp, user}
_command_history: dict[int, deque] = defaultdict(lambda: deque(maxlen=50))

KEEPALIVE_INTERVAL = 30  # seconds


@router.post("/servers/{server_id}/command", response_model=CommandResponse)
async def send_command(
    server_id: int,
    data: CommandRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    plugin = get_plugin(server.game_type)
    password = decrypt_rcon_password(server.rcon_password_encrypted)
    await plugin.connect(server.host, server.rcon_port, password, server_id=server.id)
    try:
        output = await plugin.send_command(data.command)
    finally:
        await plugin.disconnect()
    await log_activity(db, server_id=server_id, user_id=_user.id, action=ActionType.COMMAND, detail=data.command)
    await db.commit()
    return CommandResponse(output=output)


async def _ws_check_server_access(username: str, server_id: int) -> tuple[int | None, bool]:
    """Check if a WebSocket user has MODERATOR+ access to a server.

    Returns (user_id, has_access).
    """
    async with async_session() as db:
        res = await db.execute(select(User).where(User.username == username))
        user = res.scalar_one_or_none()
        if not user:
            return None, False

        # Global ADMIN+ can access everything
        if ROLE_HIERARCHY.get(UserRole(user.role), 0) >= ROLE_HIERARCHY[UserRole.ADMIN]:
            return user.id, True

        # Check per-server permission (MODERATOR+)
        perm_res = await db.execute(
            select(ServerPermission).where(
                ServerPermission.user_id == user.id,
                ServerPermission.server_id == server_id,
            )
        )
        perm = perm_res.scalar_one_or_none()
        if perm and ROLE_HIERARCHY.get(UserRole(perm.role), 0) >= ROLE_HIERARCHY[UserRole.MODERATOR]:
            return user.id, True

        return user.id, False


@router.websocket("/ws/console/{server_id}")
async def websocket_console(websocket: WebSocket, server_id: int):
    # Authenticate via query param token (JWT)
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4001, reason="Invalid token")
        return
    username = payload.get("sub", "unknown")

    # Check permissions (MODERATOR+ on this server)
    ws_user_id, has_access = await _ws_check_server_access(username, server_id)
    if not has_access:
        await websocket.close(code=4003, reason="Insufficient permissions")
        return

    await websocket.accept()

    # Look up server and establish RCON
    async with async_session() as db:
        result = await db.execute(select(Server).where(Server.id == server_id))
        server = result.scalar_one_or_none()

    if not server:
        await websocket.send_json({"type": "error", "message": "Server not found"})
        await websocket.close(code=4004)
        return

    plugin = get_plugin(server.game_type)
    password = decrypt_rcon_password(server.rcon_password_encrypted)
    try:
        await plugin.connect(server.host, server.rcon_port, password, server_id=server.id)
    except Exception as e:
        await websocket.send_json({"type": "error", "message": f"RCON connection failed: {e}"})
        await websocket.close(code=4002)
        return

    await websocket.send_json({"type": "connected", "server_id": server_id, "server_name": server.name})

    # Send existing command history for this server
    history = list(_command_history[server_id])
    if history:
        await websocket.send_json({"type": "history", "entries": history})

    async def keepalive():
        """Send periodic pings to detect dead connections."""
        try:
            while True:
                await asyncio.sleep(KEEPALIVE_INTERVAL)
                await websocket.send_json({"type": "ping", "ts": time.time()})
        except Exception:
            pass

    ping_task = asyncio.create_task(keepalive())

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except (json.JSONDecodeError, AttributeError):
                data = {"command": raw}

            # Handle pong from client
            if data.get("type") == "pong":
                continue

            command = data.get("command", "").strip()
            if not command:
                continue

            output = await plugin.send_command(command)

            entry = {
                "command": command,
                "output": output,
                "timestamp": time.time(),
                "user": username,
            }
            _command_history[server_id].append(entry)

            # Log command activity
            try:
                async with async_session() as _db:
                    await log_activity(_db, server_id=server_id, user_id=ws_user_id, action=ActionType.COMMAND, detail=command)
                    await _db.commit()
            except Exception:
                logger.debug("Failed to log WS command activity", exc_info=True)

            await websocket.send_json({"type": "response", "command": command, "output": output})
    except WebSocketDisconnect:
        logger.info("WebSocket disconnected for server %s (user=%s)", server_id, username)
    except Exception as e:
        logger.error("WebSocket error for server %s: %s", server_id, e)
    finally:
        ping_task.cancel()
        await plugin.disconnect()
