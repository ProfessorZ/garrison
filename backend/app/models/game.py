from sqlalchemy import Column, Integer, String
from app.database import Base


class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    plugin_name = Column(String(50), nullable=False, unique=True)
    default_rcon_port = Column(Integer, nullable=True)
