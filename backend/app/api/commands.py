"""API endpoints for querying RCON command schemas."""

from collections import Counter

from fastapi import APIRouter, HTTPException

from app.schemas.rcon_commands import (
    CommandCategoryInfo,
    CommandDetailResponse,
    CommandListResponse,
    get_schema,
)

router = APIRouter(prefix="/api/games", tags=["commands"])


@router.get("/{game_type}/commands", response_model=CommandListResponse)
async def list_commands(game_type: str, version: str | None = None):
    """Return all commands for a game (optionally for a specific schema version)."""
    schema = get_schema(game_type, version)
    if schema is None:
        raise HTTPException(status_code=404, detail=f"No command schema for game '{game_type}'" + (f" version {version}" if version else ""))
    return CommandListResponse(
        game_name=schema.game_name,
        schema_version=schema.schema_version,
        commands=schema.commands,
    )


@router.get("/{game_type}/commands/{command_name}", response_model=CommandDetailResponse)
async def get_command(game_type: str, command_name: str, version: str | None = None):
    """Return details for a single command."""
    schema = get_schema(game_type, version)
    if schema is None:
        raise HTTPException(status_code=404, detail=f"No command schema for game '{game_type}'")
    for cmd in schema.commands:
        if cmd.name == command_name:
            return CommandDetailResponse(
                game_name=schema.game_name,
                schema_version=schema.schema_version,
                command=cmd,
            )
    raise HTTPException(status_code=404, detail=f"Command '{command_name}' not found")


@router.get("/{game_type}/categories", response_model=list[CommandCategoryInfo])
async def list_categories(game_type: str, version: str | None = None):
    """Return command categories with counts."""
    schema = get_schema(game_type, version)
    if schema is None:
        raise HTTPException(status_code=404, detail=f"No command schema for game '{game_type}'")
    counts = Counter(cmd.category for cmd in schema.commands)
    return [CommandCategoryInfo(category=cat, count=n) for cat, n in sorted(counts.items(), key=lambda x: x[0].value)]
