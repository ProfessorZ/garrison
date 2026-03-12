import asyncio
import json
import logging
import time
from datetime import datetime, timezone

import aiohttp
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.security import decrypt_rcon_password
from app.database import async_session
from app.models.server import Server
from app.models.server_webhook import ServerWebhook

logger = logging.getLogger(__name__)

# Rate limit tracking: {(webhook_id, event_type): last_sent_timestamp}
_rate_limits: dict[tuple[int, str], float] = {}
RATE_LIMIT_SECONDS = 5

# Embed colors
COLOR_GREEN = 0x00D4AA   # online, join
COLOR_RED = 0xFF4757      # offline, leave, ban
COLOR_YELLOW = 0xFFBF24   # kick, warning
COLOR_BLUE = 0x3B82F6     # info, scheduled command
COLOR_ORANGE = 0xFF6B35   # error

EVENT_COLORS = {
    "server_online": COLOR_GREEN,
    "server_offline": COLOR_RED,
    "player_join": COLOR_GREEN,
    "player_leave": COLOR_RED,
    "player_kick": COLOR_YELLOW,
    "player_ban": COLOR_RED,
    "scheduled_command": COLOR_BLUE,
    "server_error": COLOR_ORANGE,
}


def _is_rate_limited(webhook_id: int, event_type: str) -> bool:
    key = (webhook_id, event_type)
    now = time.monotonic()
    last = _rate_limits.get(key, 0)
    if now - last < RATE_LIMIT_SECONDS:
        return True
    _rate_limits[key] = now
    return False


async def _send_webhook(url: str, embed: dict) -> bool:
    payload = {"embeds": [embed]}
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status == 204 or resp.status == 200:
                    return True
                if resp.status == 429:
                    logger.warning("Discord webhook rate limited (HTTP 429)")
                    return False
                logger.warning("Discord webhook returned %d", resp.status)
                return False
    except Exception as e:
        logger.error("Discord webhook send failed: %s", e)
        return False


async def _get_webhooks_for_event(
    db: AsyncSession, event_type: str, server_id: int | None = None
) -> list[tuple[int, str]]:
    """Return list of (webhook_id, decrypted_url) for active webhooks matching this event."""
    q = select(ServerWebhook).where(
        ServerWebhook.is_active.is_(True),
    )
    if server_id is not None:
        # Match server-specific OR global (server_id IS NULL)
        q = q.where(
            (ServerWebhook.server_id == server_id) | (ServerWebhook.server_id.is_(None))
        )
    else:
        q = q.where(ServerWebhook.server_id.is_(None))

    result = await db.execute(q)
    webhooks = result.scalars().all()

    matched = []
    for wh in webhooks:
        try:
            events = json.loads(wh.events) if isinstance(wh.events, str) else wh.events
        except (json.JSONDecodeError, TypeError):
            events = []
        if event_type in events:
            try:
                url = decrypt_rcon_password(wh.webhook_url_encrypted)
                matched.append((wh.id, url))
            except Exception:
                logger.error("Failed to decrypt webhook URL for webhook %d", wh.id)
    return matched


def _build_embed(
    title: str,
    description: str,
    event_type: str,
    server_name: str | None = None,
    game_type: str | None = None,
    fields: list[dict] | None = None,
    footer_text: str | None = None,
) -> dict:
    embed: dict = {
        "title": title,
        "description": description,
        "color": EVENT_COLORS.get(event_type, COLOR_BLUE),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    if server_name:
        author: dict = {"name": server_name}
        if game_type:
            author["name"] = f"{server_name} ({game_type})"
        embed["author"] = author

    if fields:
        embed["fields"] = fields

    if footer_text:
        embed["footer"] = {"text": footer_text}

    return embed


async def notify_event(
    event_type: str,
    title: str,
    description: str,
    server_id: int | None = None,
    server_name: str | None = None,
    game_type: str | None = None,
    fields: list[dict] | None = None,
    footer_text: str | None = None,
) -> None:
    """Send a Discord webhook notification for the given event. Fire-and-forget, never raises."""
    try:
        async with async_session() as db:
            webhooks = await _get_webhooks_for_event(db, event_type, server_id)

        if not webhooks:
            return

        embed = _build_embed(
            title=title,
            description=description,
            event_type=event_type,
            server_name=server_name,
            game_type=game_type,
            fields=fields,
            footer_text=footer_text,
        )

        tasks = []
        for wh_id, url in webhooks:
            if _is_rate_limited(wh_id, event_type):
                logger.debug("Rate limited webhook %d for event %s", wh_id, event_type)
                continue
            tasks.append(_send_webhook(url, embed))

        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    except Exception as e:
        logger.error("Failed to send Discord notification: %s", e)


# Convenience functions for specific event types

async def notify_server_online(server_id: int, server_name: str, game_type: str, player_count: int | None = None) -> None:
    footer = f"{player_count} players online" if player_count is not None else None
    await notify_event(
        event_type="server_online",
        title="Server Online",
        description=f"**{server_name}** is now online.",
        server_id=server_id,
        server_name=server_name,
        game_type=game_type,
        footer_text=footer,
    )


async def notify_server_offline(server_id: int, server_name: str, game_type: str) -> None:
    await notify_event(
        event_type="server_offline",
        title="Server Offline",
        description=f"**{server_name}** has gone offline.",
        server_id=server_id,
        server_name=server_name,
        game_type=game_type,
    )


async def notify_player_join(server_id: int, server_name: str, game_type: str, player_name: str, player_count: int | None = None) -> None:
    footer = f"{player_count} players online" if player_count is not None else None
    await notify_event(
        event_type="player_join",
        title="Player Joined",
        description=f"**{player_name}** joined the server.",
        server_id=server_id,
        server_name=server_name,
        game_type=game_type,
        footer_text=footer,
    )


async def notify_player_leave(server_id: int, server_name: str, game_type: str, player_name: str, player_count: int | None = None) -> None:
    footer = f"{player_count} players online" if player_count is not None else None
    await notify_event(
        event_type="player_leave",
        title="Player Left",
        description=f"**{player_name}** left the server.",
        server_id=server_id,
        server_name=server_name,
        game_type=game_type,
        footer_text=footer,
    )


async def notify_player_kick(server_id: int, server_name: str, game_type: str, player_name: str, reason: str = "", kicked_by: str = "") -> None:
    desc = f"**{player_name}** was kicked from the server."
    fields = []
    if reason:
        fields.append({"name": "Reason", "value": reason, "inline": True})
    if kicked_by:
        fields.append({"name": "Kicked By", "value": kicked_by, "inline": True})
    await notify_event(
        event_type="player_kick",
        title="Player Kicked",
        description=desc,
        server_id=server_id,
        server_name=server_name,
        game_type=game_type,
        fields=fields or None,
    )


async def notify_player_ban(server_id: int, server_name: str, game_type: str, player_name: str, reason: str = "", banned_by: str = "") -> None:
    desc = f"**{player_name}** was banned from the server."
    fields = []
    if reason:
        fields.append({"name": "Reason", "value": reason, "inline": True})
    if banned_by:
        fields.append({"name": "Banned By", "value": banned_by, "inline": True})
    await notify_event(
        event_type="player_ban",
        title="Player Banned",
        description=desc,
        server_id=server_id,
        server_name=server_name,
        game_type=game_type,
        fields=fields or None,
    )


async def notify_scheduled_command(server_id: int, server_name: str, game_type: str, command_name: str, command: str, result: str = "") -> None:
    fields = [
        {"name": "Command", "value": f"`{command}`", "inline": True},
    ]
    if result:
        fields.append({"name": "Result", "value": result[:200], "inline": False})
    await notify_event(
        event_type="scheduled_command",
        title="Scheduled Command Executed",
        description=f"**{command_name}** ran successfully.",
        server_id=server_id,
        server_name=server_name,
        game_type=game_type,
        fields=fields,
    )


async def notify_server_error(server_id: int, server_name: str, game_type: str, error_message: str) -> None:
    await notify_event(
        event_type="server_error",
        title="Server Error",
        description=f"RCON connection to **{server_name}** failed.",
        server_id=server_id,
        server_name=server_name,
        game_type=game_type,
        fields=[{"name": "Error", "value": error_message[:500], "inline": False}],
    )


async def send_test_webhook(webhook_url: str) -> bool:
    """Send a test message to a webhook URL (already decrypted). Returns True if successful."""
    embed = _build_embed(
        title="Garrison Test",
        description="This is a test notification from Garrison. If you see this, your webhook is configured correctly!",
        event_type="server_online",
        footer_text="Garrison Server Command Center",
    )
    return await _send_webhook(webhook_url, embed)
