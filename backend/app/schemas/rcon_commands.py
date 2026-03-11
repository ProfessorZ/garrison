"""Pydantic models for the versioned RCON command schema system."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class CommandCategory(str, Enum):
    ADMIN = "ADMIN"
    PLAYER_MGMT = "PLAYER_MGMT"
    WORLD = "WORLD"
    MODERATION = "MODERATION"
    SERVER = "SERVER"
    WHITELIST = "WHITELIST"
    DEBUG = "DEBUG"


class ParamType(str, Enum):
    STRING = "string"
    INTEGER = "integer"
    BOOLEAN = "boolean"
    FLOAT = "float"
    ENUM = "enum"


class CommandParam(BaseModel):
    name: str
    type: ParamType
    required: bool = True
    description: str = ""
    enum_values: list[str] | None = None


class RconCommandSchema(BaseModel):
    name: str
    description: str
    usage: str
    category: CommandCategory
    parameters: list[CommandParam] = []


class GameCommandSchema(BaseModel):
    game_name: str
    schema_version: str
    min_game_version: str
    max_game_version: Optional[str] = None
    commands: list[RconCommandSchema]


# ---------------------------------------------------------------------------
# Schema registry: maps (game_type, version) → GameCommandSchema
# ---------------------------------------------------------------------------
_REGISTRY: dict[str, list[GameCommandSchema]] = {}


def register_schema(game_type: str, schema: GameCommandSchema) -> None:
    _REGISTRY.setdefault(game_type, []).append(schema)


def get_schema(game_type: str, version: str | None = None) -> GameCommandSchema | None:
    """Return a command schema for *game_type*.

    If *version* is ``None`` the latest registered schema (by insertion
    order) is returned.
    """
    schemas = _REGISTRY.get(game_type, [])
    if not schemas:
        return None
    if version is None:
        return schemas[-1]
    for s in schemas:
        if s.schema_version == version:
            return s
    return None


def list_schemas(game_type: str) -> list[GameCommandSchema]:
    return list(_REGISTRY.get(game_type, []))


# ---------------------------------------------------------------------------
# Response helpers used by the API layer
# ---------------------------------------------------------------------------

class CommandCategoryInfo(BaseModel):
    category: CommandCategory
    count: int


class CommandListResponse(BaseModel):
    game_name: str
    schema_version: str
    commands: list[RconCommandSchema]


class CommandDetailResponse(BaseModel):
    game_name: str
    schema_version: str
    command: RconCommandSchema
