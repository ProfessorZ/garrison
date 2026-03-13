import enum

from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from app.database import Base


class UserRole(str, enum.Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MODERATOR = "MODERATOR"
    VIEWER = "VIEWER"


# Hierarchy: OWNER > ADMIN > MODERATOR > VIEWER
ROLE_HIERARCHY = {
    UserRole.OWNER: 4,
    UserRole.ADMIN: 3,
    UserRole.MODERATOR: 2,
    UserRole.VIEWER: 1,
}


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_admin = Column(Boolean, default=False)
    role = Column(String(20), nullable=False, default=UserRole.VIEWER.value)
    discord_id = Column(String(30), unique=True, nullable=True, index=True)
    discord_username = Column(String(100), nullable=True)
    discord_avatar = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
