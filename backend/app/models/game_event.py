from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func, Index

from app.database import Base


class GameEvent(Base):
    __tablename__ = "game_events"

    id = Column(Integer, primary_key=True)
    server_id = Column(Integer, ForeignKey("servers.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(50), nullable=False)  # kill, chat, connect, disconnect, kick, ban, teamkill
    timestamp = Column(DateTime(timezone=True), nullable=False)
    player_name = Column(String(200), nullable=True)
    player_id = Column(String(100), nullable=True)  # steam id or game-specific id
    target_name = Column(String(200), nullable=True)  # for kills
    target_id = Column(String(100), nullable=True)
    message = Column(String, nullable=True)  # for chat
    weapon = Column(String(200), nullable=True)  # for kills
    raw = Column(Text, nullable=True)  # raw log line
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("ix_game_events_server_type", "server_id", "event_type"),
        Index("ix_game_events_server_ts", "server_id", "timestamp"),
        Index("ix_game_events_player", "player_id"),
    )
