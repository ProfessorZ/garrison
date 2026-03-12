import logging
import time

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.permissions import require_server_access
from app.auth.security import decrypt_rcon_password
from app.database import get_db
from app.plugins.bridge import get_plugin
from app.models.server import Server
from app.models.user import User, UserRole
from app.schemas.server_options import ServerOption, ServerOptionUpdate, BulkOptionUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/servers", tags=["server-options"])

# ── Options cache: server_id -> (timestamp, options_list) ────────────────────
_options_cache: dict[int, tuple[float, list]] = {}
CACHE_TTL = 60  # seconds


async def _get_server(server_id: int, db: AsyncSession) -> Server:
    result = await db.execute(select(Server).where(Server.id == server_id))
    server = result.scalar_one_or_none()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return server


async def _get_connected_plugin(server: Server):
    """Return a ConnectedPlugin wired to the server's RCON."""
    plugin = get_plugin(server.game_type)
    password = decrypt_rcon_password(server.rcon_password_encrypted)
    await plugin.connect(server.host, server.rcon_port, password, server_id=server.id)
    return plugin


def _plugin_option_to_schema(opt) -> ServerOption:
    """Convert a plugin ServerOption dataclass to the Pydantic ServerOption schema."""
    return ServerOption(
        name=opt.name,
        value=opt.value,
        type=opt.option_type,
        category=opt.category,
        description=opt.description,
    )


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/{server_id}/options", response_model=list[ServerOption])
async def get_server_options(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.MODERATOR)),
):
    # Check cache
    cached = _options_cache.get(server_id)
    if cached and (time.time() - cached[0]) < CACHE_TTL:
        return cached[1]

    server = await _get_server(server_id, db)
    plugin = await _get_connected_plugin(server)
    try:
        plugin_options = await plugin.get_options()
    finally:
        await plugin.disconnect()

    options = [_plugin_option_to_schema(o) for o in plugin_options]
    _options_cache[server_id] = (time.time(), options)
    return options


@router.put("/{server_id}/options/{option_name}", response_model=ServerOption)
async def update_server_option(
    server_id: int,
    option_name: str,
    data: ServerOptionUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.ADMIN)),
):
    server = await _get_server(server_id, db)
    plugin = await _get_connected_plugin(server)
    try:
        result = await plugin.set_option(option_name, data.value)
    finally:
        await plugin.disconnect()

    logger.info("set option %s=%s on server %s: %s", option_name, data.value, server_id, result)

    # Invalidate cache and re-fetch to get accurate metadata
    _options_cache.pop(server_id, None)

    # Re-fetch options to get the updated value with proper metadata
    plugin2 = await _get_connected_plugin(server)
    try:
        plugin_options = await plugin2.get_options()
    finally:
        await plugin2.disconnect()

    for opt in plugin_options:
        if opt.name == option_name:
            return _plugin_option_to_schema(opt)

    # Fallback if option wasn't found in re-fetch
    return ServerOption(name=option_name, value=data.value, type="string", category="Other", description="")


@router.put("/{server_id}/options", response_model=list[ServerOption])
async def bulk_update_options(
    server_id: int,
    data: BulkOptionUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.ADMIN)),
):
    server = await _get_server(server_id, db)
    plugin = await _get_connected_plugin(server)
    try:
        for name, value in data.options.items():
            result = await plugin.set_option(name, value)
            logger.info("set option %s=%s on server %s: %s", name, value, server_id, result)
    finally:
        await plugin.disconnect()

    # Invalidate cache
    _options_cache.pop(server_id, None)

    # Re-fetch all options
    plugin2 = await _get_connected_plugin(server)
    try:
        plugin_options = await plugin2.get_options()
    finally:
        await plugin2.disconnect()

    # Filter to only the options that were updated
    updated_names = set(data.options.keys())
    return [_plugin_option_to_schema(o) for o in plugin_options if o.name in updated_names]
