from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.database import get_db
from app.models.user import User, UserRole, ROLE_HIERARCHY
from app.models.server_permission import ServerPermission


def _role_level(role: str) -> int:
    try:
        return ROLE_HIERARCHY[UserRole(role)]
    except (ValueError, KeyError):
        return 0


def require_role(min_role: UserRole):
    """Dependency: require a minimum global role."""

    async def _check(user: User = Depends(get_current_user)):
        if _role_level(user.role) < ROLE_HIERARCHY[min_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {min_role.value} role or higher",
            )
        return user

    return _check


def require_server_access(min_role: UserRole):
    """Dependency factory: require a minimum role on a specific server.

    The endpoint must have a path parameter named `server_id`.
    Global OWNER/ADMIN bypass per-server checks.
    """

    async def _check(
        server_id: int,
        user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        user_level = _role_level(user.role)
        # Global ADMIN+ can access everything
        if user_level >= ROLE_HIERARCHY[UserRole.ADMIN]:
            return user

        # Check per-server permission
        result = await db.execute(
            select(ServerPermission).where(
                ServerPermission.user_id == user.id,
                ServerPermission.server_id == server_id,
            )
        )
        perm = result.scalar_one_or_none()
        if not perm or _role_level(perm.role) < ROLE_HIERARCHY[min_role]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {min_role.value} access on this server",
            )
        return user

    return _check
