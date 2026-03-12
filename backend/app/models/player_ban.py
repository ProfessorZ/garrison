from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class PlayerBan(Base):
    __tablename__ = "player_bans"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("known_players.id", ondelete="CASCADE"), nullable=False, index=True)
    server_id = Column(Integer, ForeignKey("servers.id", ondelete="SET NULL"), nullable=True)
    banned_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reason = Column(Text, nullable=True)
    banned_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    unbanned_at = Column(DateTime(timezone=True), nullable=True)
    unbanned_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    player = relationship("KnownPlayer", back_populates="bans")
    server = relationship("Server")
    banned_by = relationship("User", foreign_keys=[banned_by_user_id])
    unbanned_by = relationship("User", foreign_keys=[unbanned_by_user_id])
