from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class KnownPlayerOut(BaseModel):
    id: int
    name: str
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    total_playtime_seconds: int = 0
    session_count: int = 0
    is_banned: bool = False
    ban_count: int = 0
    notes: Optional[str] = None
    is_online: bool = False
    current_server_id: Optional[int] = None
    current_server_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class KnownPlayerList(BaseModel):
    items: list[KnownPlayerOut]
    total: int
    page: int
    per_page: int
    pages: int


class PlayerSessionOut(BaseModel):
    id: int
    player_id: int
    server_id: int
    server_name: Optional[str] = None
    joined_at: Optional[datetime] = None
    left_at: Optional[datetime] = None
    duration_seconds: Optional[int] = None

    model_config = {"from_attributes": True}


class PlayerSessionList(BaseModel):
    items: list[PlayerSessionOut]
    total: int
    page: int
    per_page: int
    pages: int


class PlayerBanOut(BaseModel):
    id: int
    player_id: int
    server_id: Optional[int] = None
    server_name: Optional[str] = None
    banned_by_user_id: Optional[int] = None
    banned_by_username: Optional[str] = None
    reason: Optional[str] = None
    banned_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool = True
    unbanned_at: Optional[datetime] = None
    unbanned_by_user_id: Optional[int] = None
    unbanned_by_username: Optional[str] = None

    model_config = {"from_attributes": True}


class PlayerNameHistoryOut(BaseModel):
    id: int
    player_id: int
    name: str
    first_seen_with_name: Optional[datetime] = None
    last_seen_with_name: Optional[datetime] = None

    model_config = {"from_attributes": True}


class PlayerProfileOut(BaseModel):
    player: KnownPlayerOut
    sessions: list[PlayerSessionOut]
    bans: list[PlayerBanOut]
    name_history: list[PlayerNameHistoryOut]


class UpdateNotesRequest(BaseModel):
    notes: str


class CreateBanRequest(BaseModel):
    reason: Optional[str] = None
    expires_at: Optional[datetime] = None
    server_id: Optional[int] = None


class EnrichedPlayer(BaseModel):
    """Player data enriched with KnownPlayer info for server player list."""
    name: str
    connected_at: Optional[str] = None
    known_player_id: Optional[int] = None
    total_playtime_seconds: int = 0
    session_count: int = 0
    is_banned: bool = False
    first_seen: Optional[datetime] = None
    first_seen_on_server: Optional[datetime] = None
    total_time_on_server: int = 0
    sessions_on_server: int = 0
