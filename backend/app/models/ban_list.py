from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class BanList(Base):
    __tablename__ = "ban_lists"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_global = Column(Boolean, nullable=False, default=False)
    created_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    created_by = relationship("User")
    entries = relationship("BanListEntry", back_populates="ban_list", cascade="all, delete-orphan")
    server_links = relationship("ServerBanList", back_populates="ban_list", cascade="all, delete-orphan")


class BanListEntry(Base):
    __tablename__ = "ban_list_entries"

    id = Column(Integer, primary_key=True, index=True)
    ban_list_id = Column(Integer, ForeignKey("ban_lists.id", ondelete="CASCADE"), nullable=False, index=True)
    player_id = Column(Integer, ForeignKey("known_players.id", ondelete="SET NULL"), nullable=True, index=True)
    player_name = Column(String(100), nullable=False)
    reason = Column(Text, nullable=True)
    added_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    added_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    ban_list = relationship("BanList", back_populates="entries")
    player = relationship("KnownPlayer")
    added_by = relationship("User")


class ServerBanList(Base):
    __tablename__ = "server_ban_lists"

    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(Integer, ForeignKey("servers.id", ondelete="CASCADE"), nullable=False, index=True)
    ban_list_id = Column(Integer, ForeignKey("ban_lists.id", ondelete="CASCADE"), nullable=False, index=True)
    auto_enforce = Column(Boolean, nullable=False, default=False)
    added_at = Column(DateTime(timezone=True), server_default=func.now())

    server = relationship("Server")
    ban_list = relationship("BanList", back_populates="server_links")
