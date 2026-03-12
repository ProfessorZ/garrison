"""Factorio server options handler — /config get / /config set."""

from app.plugins.base import ServerOption

FACTORIO_CONFIG_OPTIONS: list[str] = [
    "afk-auto-kick",
    "allow-commands",
    "autosave-interval",
    "max-players",
    "max-upload-slots",
    "max-upload-in-kilobytes-per-second",
    "name",
    "description",
    "tags",
    "password",
    "visibility-lan",
    "visibility-public",
    "require-user-verification",
    "only-admins-can-pause-the-game",
]

FACTORIO_OPTIONS_META: dict[str, dict] = {
    "afk-auto-kick": {"category": "Server", "type": "number", "description": "Kick AFK players after this many minutes (0=disabled)"},
    "allow-commands": {"category": "Server", "type": "string", "description": "Allow console commands (true/false/admins-only)"},
    "autosave-interval": {"category": "Server", "type": "number", "description": "Minutes between autosaves"},
    "max-players": {"category": "Server", "type": "number", "description": "Maximum number of players (0=unlimited)"},
    "max-upload-slots": {"category": "Network", "type": "number", "description": "Maximum upload slots"},
    "max-upload-in-kilobytes-per-second": {"category": "Network", "type": "number", "description": "Maximum upload speed (KB/s, 0=unlimited)"},
    "name": {"category": "General", "type": "string", "description": "Server name shown in browser"},
    "description": {"category": "General", "type": "string", "description": "Server description"},
    "tags": {"category": "General", "type": "string", "description": "Server tags (comma-separated)"},
    "password": {"category": "General", "type": "string", "description": "Game password (empty=no password)"},
    "visibility-lan": {"category": "Visibility", "type": "boolean", "description": "Show server on LAN"},
    "visibility-public": {"category": "Visibility", "type": "boolean", "description": "Show server in public browser"},
    "require-user-verification": {"category": "Server", "type": "boolean", "description": "Require Factorio account verification"},
    "only-admins-can-pause-the-game": {"category": "Server", "type": "boolean", "description": "Only admins can pause the game"},
}


def _infer_type(value: str) -> str:
    if value.lower() in ("true", "false"):
        return "boolean"
    try:
        float(value)
        return "number"
    except ValueError:
        return "string"


def parse_config_value(raw: str) -> str:
    """Extract value from Factorio /config get response."""
    raw = raw.strip()
    if ":" in raw:
        return raw.split(":", 1)[1].strip()
    if " is " in raw:
        return raw.split(" is ", 1)[1].strip()
    return raw


def get_option_meta(name: str, value: str) -> tuple[str, str, str]:
    """Return (type, category, description) for a Factorio config option."""
    meta = FACTORIO_OPTIONS_META.get(name)
    if meta:
        return meta["type"], meta["category"], meta["description"]
    return _infer_type(value), "Other", ""
