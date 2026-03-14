from sqlalchemy import Boolean, Column, Integer, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class ServerMetric(Base):
    __tablename__ = "server_metrics"

    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(Integer, ForeignKey("servers.id", ondelete="CASCADE"), nullable=False, index=True)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    player_count = Column(Integer, nullable=False, default=0)
    is_online = Column(Boolean, nullable=False, default=False)
    response_time_ms = Column(Integer, nullable=True)
