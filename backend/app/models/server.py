from sqlalchemy import BigInteger, Boolean, Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base


# @lat: [[servers#Server Management]]
class Server(Base):
    __tablename__ = "servers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    host = Column(String(255), nullable=False)
    port = Column(Integer, nullable=False)
    query_port = Column(Integer, nullable=True)
    rcon_port = Column(Integer, nullable=False)
    rcon_password_encrypted = Column(String(512), nullable=False)
    game_type = Column(String(50), nullable=False, default="zomboid")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Status polling columns
    last_status = Column(Boolean, nullable=True)
    last_checked = Column(DateTime(timezone=True), nullable=True)
    player_count = Column(Integer, nullable=True)

    # Discord channel for slash commands (if set, commands in this channel target this server)
    discord_channel_id = Column(BigInteger, nullable=True)

    scheduled_commands = relationship(
        "ScheduledCommand", back_populates="server", cascade="all, delete-orphan"
    )
