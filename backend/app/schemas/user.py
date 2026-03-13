from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    is_admin: bool
    role: str = "VIEWER"
    discord_id: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class DiscordLinkRequest(BaseModel):
    discord_id: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class SetRoleRequest(BaseModel):
    role: str


class ServerPermissionCreate(BaseModel):
    user_id: int
    role: str  # ADMIN, MODERATOR, VIEWER


class ServerPermissionOut(BaseModel):
    id: int
    user_id: int
    server_id: int
    role: str
    username: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
