from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class PlayerNameHistory(Base):
    __tablename__ = "player_name_history"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("known_players.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    first_seen_with_name = Column(DateTime(timezone=True), server_default=func.now())
    last_seen_with_name = Column(DateTime(timezone=True), server_default=func.now())

    player = relationship("KnownPlayer", back_populates="name_history")
