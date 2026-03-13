import enum
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.database import Base


class ActionType(str, enum.Enum):
    COMMAND = "COMMAND"
    KICK = "KICK"
    BAN = "BAN"
    UNBAN = "UNBAN"
    SERVER_CREATE = "SERVER_CREATE"
    SERVER_UPDATE = "SERVER_UPDATE"
    SERVER_DELETE = "SERVER_DELETE"
    LOGIN = "LOGIN"
    ROLE_CHANGE = "ROLE_CHANGE"
    PERMISSION_GRANT = "PERMISSION_GRANT"
    PERMISSION_REVOKE = "PERMISSION_REVOKE"
    ACCESS_DENIED = "ACCESS_DENIED"
    SCHEDULED_RUN = "SCHEDULED_RUN"
    DISCORD_COMMAND = "DISCORD_COMMAND"


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True)
    server_id = Column(Integer, ForeignKey("servers.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(String(50), nullable=False)
    detail = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    server = relationship("Server", lazy="selectin")
    user = relationship("User", lazy="selectin")
