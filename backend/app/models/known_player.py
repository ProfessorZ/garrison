from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, func
from sqlalchemy.orm import relationship
from app.database import Base


class KnownPlayer(Base):
    __tablename__ = "known_players"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    first_seen = Column(DateTime(timezone=True), server_default=func.now())
    last_seen = Column(DateTime(timezone=True), server_default=func.now())
    total_playtime_seconds = Column(Integer, nullable=False, default=0)
    session_count = Column(Integer, nullable=False, default=0)
    is_banned = Column(Boolean, nullable=False, default=False)
    ban_count = Column(Integer, nullable=False, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    sessions = relationship("PlayerSession", back_populates="player", cascade="all, delete-orphan")
    bans = relationship("PlayerBan", back_populates="player", cascade="all, delete-orphan", foreign_keys="PlayerBan.player_id")
    name_history = relationship("PlayerNameHistory", back_populates="player", cascade="all, delete-orphan")
