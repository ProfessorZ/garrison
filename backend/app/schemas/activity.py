from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.activity_log import ActionType


class ActivityLogOut(BaseModel):
    id: int
    server_id: Optional[int] = None
    user_id: Optional[int] = None
    action: ActionType
    detail: str
    created_at: datetime
    server_name: Optional[str] = None
    username: Optional[str] = None

    model_config = {"from_attributes": True}
