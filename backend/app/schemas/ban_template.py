from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class BanTemplateCreate(BaseModel):
    name: str
    reason_template: str
    duration_hours: Optional[int] = None


class BanTemplateOut(BaseModel):
    id: int
    name: str
    reason_template: str
    duration_hours: Optional[int] = None
    created_by_user_id: Optional[int] = None
    created_by_username: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
