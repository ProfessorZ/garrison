from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class Trigger(Base):
    __tablename__ = "triggers"

    id = Column(Integer, primary_key=True)
    server_id = Column(Integer, ForeignKey("servers.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    event_type = Column(String(50), nullable=False)  # player_join, player_leave, player_count_above, player_count_below, server_online, server_offline, chat_message, scheduled
    event_config = Column(JSON, default=dict)  # e.g. {"threshold": 10}, {"pattern": "griefer"}

    action_type = Column(String(50), nullable=False)  # rcon_command, discord_webhook, kick_player, ban_player
    action_config = Column(JSON, default=dict)  # e.g. {"command": "servermsg \"Welcome!\""}, {"message": "Server full!"}

    condition = Column(JSON, nullable=True)  # {"player_pattern": "regex", "time_range": {"start": "08:00", "end": "22:00"}, "player_count": {"op": "gt", "value": 5}}

    cooldown_seconds = Column(Integer, default=0, nullable=False)
    last_fired_at = Column(DateTime(timezone=True), nullable=True)
    fire_count = Column(Integer, default=0, nullable=False)

    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    server = relationship("Server", lazy="selectin")
    created_by = relationship("User", lazy="selectin")
