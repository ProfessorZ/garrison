from sqlalchemy import Column, Integer, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class PlayerNote(Base):
    __tablename__ = "player_notes"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("known_players.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    player = relationship("KnownPlayer", back_populates="player_notes")
    author = relationship("User")
