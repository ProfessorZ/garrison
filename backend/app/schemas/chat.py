from datetime import datetime

from pydantic import BaseModel


class ChatMessageOut(BaseModel):
    id: int
    server_id: int
    player_name: str
    message: str
    timestamp: datetime

    model_config = {"from_attributes": True}
