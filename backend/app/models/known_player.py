from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, JSON, func
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

    # Steam integration
    steam_id = Column(String(20), nullable=True, unique=True, index=True)
    vac_banned = Column(Boolean, nullable=False, default=False)
    vac_ban_count = Column(Integer, nullable=False, default=0)
    days_since_last_ban = Column(Integer, nullable=False, default=0)
    game_banned = Column(Boolean, nullable=False, default=False)
    steam_profile_visibility = Column(Integer, nullable=False, default=3)
    steam_avatar_url = Column(String(500), nullable=True)
    steam_persona_name = Column(String(200), nullable=True)
    alt_account_ids = Column(JSON, nullable=False, default=list)
    steam_checked_at = Column(DateTime(timezone=True), nullable=True)

    sessions = relationship("PlayerSession", back_populates="player", cascade="all, delete-orphan")
    bans = relationship("PlayerBan", back_populates="player", cascade="all, delete-orphan", foreign_keys="PlayerBan.player_id")
    name_history = relationship("PlayerNameHistory", back_populates="player", cascade="all, delete-orphan")
    player_notes = relationship("PlayerNote", back_populates="player", cascade="all, delete-orphan")
