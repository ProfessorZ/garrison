from sqlalchemy import Column, Integer, DateTime, ForeignKey, String, func
from sqlalchemy.orm import relationship
from app.database import Base


class PlayerSession(Base):
    __tablename__ = "player_sessions"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("known_players.id", ondelete="CASCADE"), nullable=False, index=True)
    server_id = Column(Integer, ForeignKey("servers.id", ondelete="CASCADE"), nullable=False, index=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    left_at = Column(DateTime(timezone=True), nullable=True)
    duration_seconds = Column(Integer, nullable=True)
    ip_address = Column(String(45), nullable=True)

    player = relationship("KnownPlayer", back_populates="sessions")
    server = relationship("Server")
