from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


class ServerWebhook(Base):
    __tablename__ = "server_webhooks"

    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(Integer, ForeignKey("servers.id", ondelete="CASCADE"), nullable=True)
    webhook_url_encrypted = Column(String(1024), nullable=False)
    events = Column(Text, nullable=False, default='["server_online","server_offline","player_join","player_leave","player_kick","player_ban","scheduled_command","server_error"]')
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    server = relationship("Server", lazy="selectin")
