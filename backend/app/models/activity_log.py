import enum
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, Text
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


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True)
    server_id = Column(Integer, ForeignKey("servers.id", ondelete="SET NULL"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action = Column(Enum(ActionType, name="action_type"), nullable=False)
    detail = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    server = relationship("Server", lazy="selectin")
    user = relationship("User", lazy="selectin")
