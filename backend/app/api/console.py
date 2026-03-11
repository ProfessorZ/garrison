import json
import logging

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import decode_access_token, decrypt_rcon_password
from app.database import get_db, async_session
from app.games.registry import get_plugin
from app.models.server import Server
from app.models.user import User
from app.schemas.server import CommandRequest, CommandResponse
from app.auth.deps import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/servers", tags=["console"])


@router.post("/{server_id}/command", response_model=CommandResponse)
async def send_command(
    server_id: int,
    data: CommandRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    plugin = get_plugin(server.game_type)
    password = decrypt_rcon_password(server.rcon_password_encrypted)
    await plugin.connect(server.host, server.rcon_port, password)
    try:
        output = await plugin.send_command(data.command)
    finally:
        await plugin.disconnect()
    return CommandResponse(output=output)


@router.websocket("/{server_id}/ws")
async def websocket_console(websocket: WebSocket, server_id: int):
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4001, reason="Invalid token")
        return

    await websocket.accept()

    async with async_session() as db:
        result = await db.execute(select(Server).where(Server.id == server_id))
        server = result.scalar_one_or_none()
        if not server:
            await websocket.send_json({"error": "Server not found"})
            await websocket.close()
            return

        plugin = get_plugin(server.game_type)
        password = decrypt_rcon_password(server.rcon_password_encrypted)
        await plugin.connect(server.host, server.rcon_port, password)

        try:
            while True:
                raw = await websocket.receive_text()
                try:
                    data = json.loads(raw)
                    command = data.get("command", "")
                except (json.JSONDecodeError, AttributeError):
                    command = raw

                if not command:
                    continue

                output = await plugin.send_command(command)
                await websocket.send_json({"command": command, "output": output})
        except WebSocketDisconnect:
            logger.info("WebSocket disconnected for server %s", server_id)
        finally:
            await plugin.disconnect()
