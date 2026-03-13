from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class BanListCreate(BaseModel):
    name: str
    description: Optional[str] = None
    is_global: bool = False


class BanListUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_global: Optional[bool] = None


class BanListOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    is_global: bool = False
    created_by_user_id: Optional[int] = None
    created_by_username: Optional[str] = None
    entry_count: int = 0
    server_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class BanListDetailOut(BanListOut):
    servers: list["ServerBanListOut"] = []


class BanListEntryCreate(BaseModel):
    player_name: str
    player_id: Optional[int] = None
    reason: Optional[str] = None
    expires_at: Optional[datetime] = None


class BanListEntryOut(BaseModel):
    id: int
    ban_list_id: int
    player_id: Optional[int] = None
    player_name: str
    reason: Optional[str] = None
    added_by_user_id: Optional[int] = None
    added_by_username: Optional[str] = None
    expires_at: Optional[datetime] = None
    is_active: bool = True
    added_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class BanListEntryList(BaseModel):
    items: list[BanListEntryOut]
    total: int
    page: int
    per_page: int
    pages: int


class ServerBanListCreate(BaseModel):
    server_id: int
    auto_enforce: bool = False


class ServerBanListOut(BaseModel):
    server_id: int
    server_name: Optional[str] = None
    ban_list_id: int
    auto_enforce: bool = False
    added_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
