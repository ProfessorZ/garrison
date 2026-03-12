from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.activity import ActivityLogOut


class DashboardStats(BaseModel):
    total_servers: int
    online_servers: int
    total_players: int
    known_players: int = 0
    recent_activity: list[ActivityLogOut]


class DashboardServer(BaseModel):
    id: int
    name: str
    host: str
    port: int
    game_type: str
    last_status: Optional[bool] = None
    last_checked: Optional[datetime] = None
    player_count: Optional[int] = None

    model_config = {"from_attributes": True}
