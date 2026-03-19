import logging
import re
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.trigger import Trigger
from app.models.server import Server
from app.models.activity_log import ActivityLog

logger = logging.getLogger(__name__)

VALID_EVENT_TYPES = {
    "player_join", "player_leave",
    "player_count_above", "player_count_below",
    "server_online", "server_offline",
    "chat_message",
    "vac_ban_detected",
}

VALID_ACTION_TYPES = {
    "rcon_command", "discord_webhook", "kick_player", "ban_player",
}


def _template_replace(text: str, context: dict) -> str:
    """Replace {player_name}, {server_name}, {player_count}, {message} in text."""
    server = context.get("server")
    replacements = {
        "player_name": context.get("player_name", ""),
        "server_name": server.name if server else "",
        "player_count": str(context.get("player_count", "")),
        "message": context.get("message", ""),
    }
    for key, value in replacements.items():
        text = text.replace(f"{{{key}}}", str(value))
    return text


def _check_cooldown(trigger: Trigger, now: datetime) -> bool:
    """Return True if trigger is NOT on cooldown (can fire)."""
    if trigger.cooldown_seconds <= 0:
        return True
    if trigger.last_fired_at is None:
        return True
    elapsed = (now - trigger.last_fired_at).total_seconds()
    return elapsed >= trigger.cooldown_seconds


def _check_conditions(trigger: Trigger, context: dict) -> bool:
    """Check optional conditions. Return True if all conditions pass."""
    cond = trigger.condition
    if not cond:
        return True

    # Player name pattern
    player_pattern = cond.get("player_pattern")
    if player_pattern:
        player_name = context.get("player_name", "")
        try:
            if not re.search(player_pattern, player_name, re.IGNORECASE):
                return False
        except re.error:
            logger.warning("Invalid regex in trigger %d condition: %s", trigger.id, player_pattern)
            return False

    # Time of day range
    time_range = cond.get("time_range")
    if time_range:
        now = datetime.now(timezone.utc)
        current_time = now.strftime("%H:%M")
        start = time_range.get("start", "00:00")
        end = time_range.get("end", "23:59")
        if start <= end:
            if not (start <= current_time <= end):
                return False
        else:
            # Wraps midnight, e.g. 22:00 - 06:00
            if not (current_time >= start or current_time <= end):
                return False

    # Player count comparison
    player_count_cond = cond.get("player_count")
    if player_count_cond:
        pc = context.get("player_count")
        if pc is not None:
            op = player_count_cond.get("op", "gt")
            val = player_count_cond.get("value", 0)
            if op == "gt" and not (pc > val):
                return False
            elif op == "lt" and not (pc < val):
                return False
            elif op == "eq" and not (pc == val):
                return False
            elif op == "gte" and not (pc >= val):
                return False
            elif op == "lte" and not (pc <= val):
                return False

    # Server name matches
    server_pattern = cond.get("server_pattern")
    if server_pattern:
        server = context.get("server")
        server_name = server.name if server else ""
        try:
            if not re.search(server_pattern, server_name, re.IGNORECASE):
                return False
        except re.error:
            return False

    return True


def _check_event_config(trigger: Trigger, context: dict) -> bool:
    """Check event-specific config matches. E.g. threshold for count events, pattern for chat."""
    config = trigger.event_config or {}

    if trigger.event_type in ("player_count_above", "player_count_below"):
        threshold = config.get("threshold")
        if threshold is None:
            return True
        pc = context.get("player_count")
        if pc is None:
            return False
        if trigger.event_type == "player_count_above":
            return pc > threshold
        else:
            return pc < threshold

    if trigger.event_type == "chat_message":
        pattern = config.get("pattern")
        if not pattern:
            return True
        message = context.get("message", "")
        try:
            return bool(re.search(pattern, message, re.IGNORECASE))
        except re.error:
            logger.warning("Invalid regex in trigger %d event_config: %s", trigger.id, pattern)
            return False

    return True


async def _execute_action(trigger: Trigger, context: dict, db: AsyncSession) -> str:
    """Execute the trigger's action. Returns a result string."""
    server = context.get("server")

    if trigger.action_type == "rcon_command":
        command = trigger.action_config.get("command", "")
        if not command:
            return "No command configured"
        command = _template_replace(command, context)
        target_server = server
        if not target_server and trigger.server_id:
            result = await db.execute(select(Server).where(Server.id == trigger.server_id))
            target_server = result.scalar_one_or_none()
        if not target_server:
            return "No server to send command to"
        try:
            from app.auth.security import decrypt_rcon_password
            from app.plugins.bridge import get_plugin
            plugin = get_plugin(target_server.game_type)
            password = decrypt_rcon_password(target_server.rcon_password_encrypted)
            await plugin.connect(target_server.host, target_server.rcon_port, password, server_id=target_server.id)
            try:
                output = await plugin.send_command(command)
            finally:
                await plugin.disconnect()
            return f"RCON: {(output or '')[:200]}"
        except Exception as e:
            logger.error("Trigger %d RCON action failed: %s", trigger.id, e)
            return f"RCON error: {e}"

    elif trigger.action_type == "discord_webhook":
        message = trigger.action_config.get("message", "")
        if message:
            message = _template_replace(message, context)
        else:
            message = f"Trigger **{trigger.name}** fired"

        server_id = trigger.server_id or (server.id if server else None)
        server_name = server.name if server else None
        game_type = server.game_type if server else None

        try:
            from app.services.discord_webhooks import notify_event
            await notify_event(
                event_type=trigger.event_type,
                title=f"Trigger: {trigger.name}",
                description=message,
                server_id=server_id,
                server_name=server_name,
                game_type=game_type,
            )
            return "Discord webhook sent"
        except Exception as e:
            logger.error("Trigger %d discord action failed: %s", trigger.id, e)
            return f"Discord error: {e}"

    elif trigger.action_type == "kick_player":
        player_name = context.get("player_name")
        if not player_name:
            return "No player to kick"
        reason = trigger.action_config.get("reason", "Automated kick by trigger")
        target_server = server
        if not target_server and trigger.server_id:
            result = await db.execute(select(Server).where(Server.id == trigger.server_id))
            target_server = result.scalar_one_or_none()
        if not target_server:
            return "No server to kick from"
        try:
            from app.auth.security import decrypt_rcon_password
            from app.plugins.bridge import get_plugin
            plugin = get_plugin(target_server.game_type)
            password = decrypt_rcon_password(target_server.rcon_password_encrypted)
            await plugin.connect(target_server.host, target_server.rcon_port, password, server_id=target_server.id)
            try:
                output = await plugin.kick_player(player_name, reason)
            finally:
                await plugin.disconnect()
            return f"Kicked {player_name}: {(output or '')[:200]}"
        except Exception as e:
            logger.error("Trigger %d kick action failed: %s", trigger.id, e)
            return f"Kick error: {e}"

    elif trigger.action_type == "ban_player":
        player_name = context.get("player_name")
        if not player_name:
            return "No player to ban"
        reason = trigger.action_config.get("reason", "Automated ban by trigger")
        target_server = server
        if not target_server and trigger.server_id:
            result = await db.execute(select(Server).where(Server.id == trigger.server_id))
            target_server = result.scalar_one_or_none()
        if not target_server:
            return "No server to ban from"
        try:
            from app.auth.security import decrypt_rcon_password
            from app.plugins.bridge import get_plugin
            plugin = get_plugin(target_server.game_type)
            password = decrypt_rcon_password(target_server.rcon_password_encrypted)
            await plugin.connect(target_server.host, target_server.rcon_port, password, server_id=target_server.id)
            try:
                output = await plugin.ban_player(player_name, reason)
            finally:
                await plugin.disconnect()
            return f"Banned {player_name}: {(output or '')[:200]}"
        except Exception as e:
            logger.error("Trigger %d ban action failed: %s", trigger.id, e)
            return f"Ban error: {e}"

    return f"Unknown action type: {trigger.action_type}"


async def fire_event(event_type: str, server_id: int | None, context: dict) -> None:
    """
    Called when an event occurs. Loads matching triggers and executes them.

    Context keys by event:
      - player_join/leave: {"player_name": str, "server": Server, "player_count": int}
      - player_count_above/below: {"player_count": int, "server": Server}
      - server_online/offline: {"server": Server}
      - chat_message: {"player_name": str, "message": str, "server": Server}
    """
    try:
        async with async_session() as db:
            # Load active triggers matching event type for this server or global
            q = select(Trigger).where(
                Trigger.is_active.is_(True),
                Trigger.event_type == event_type,
            )
            if server_id is not None:
                q = q.where(
                    (Trigger.server_id == server_id) | (Trigger.server_id.is_(None))
                )
            else:
                q = q.where(Trigger.server_id.is_(None))

            result = await db.execute(q)
            triggers = result.scalars().all()

            if not triggers:
                return

            now = datetime.now(timezone.utc)

            for trigger in triggers:
                try:
                    if not _check_cooldown(trigger, now):
                        continue
                    if not _check_event_config(trigger, context):
                        continue
                    if not _check_conditions(trigger, context):
                        continue

                    action_result = await _execute_action(trigger, context, db)

                    trigger.last_fired_at = now
                    trigger.fire_count = (trigger.fire_count or 0) + 1

                    # Log to activity
                    log = ActivityLog(
                        server_id=server_id,
                        action="TRIGGER_FIRE",
                        detail=f"Trigger '{trigger.name}' ({trigger.event_type} → {trigger.action_type}): {action_result[:300]}",
                    )
                    db.add(log)

                    logger.info("Trigger %d '%s' fired: %s", trigger.id, trigger.name, action_result[:100])
                except Exception as e:
                    logger.error("Error executing trigger %d: %s", trigger.id, e)

            await db.commit()
    except Exception as e:
        logger.error("TriggerEngine.fire_event failed for %s: %s", event_type, e)


async def test_trigger(trigger_id: int) -> str:
    """Fire a trigger manually with dummy context, ignoring cooldown."""
    async with async_session() as db:
        result = await db.execute(select(Trigger).where(Trigger.id == trigger_id))
        trigger = result.scalar_one_or_none()
        if not trigger:
            return "Trigger not found"

        server = None
        if trigger.server_id:
            srv_result = await db.execute(select(Server).where(Server.id == trigger.server_id))
            server = srv_result.scalar_one_or_none()

        context = {
            "player_name": "TestPlayer",
            "server": server,
            "player_count": 5,
            "message": "Test message from trigger system",
        }

        action_result = await _execute_action(trigger, context, db)

        trigger.last_fired_at = datetime.now(timezone.utc)
        trigger.fire_count = (trigger.fire_count or 0) + 1
        await db.commit()

        return action_result
