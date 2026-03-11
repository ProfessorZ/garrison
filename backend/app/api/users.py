from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.permissions import require_role, require_server_access
from app.database import get_db
from app.models.user import User, UserRole
from app.models.server_permission import ServerPermission, ServerRole
from app.models.activity_log import ActionType
from app.schemas.user import UserOut, SetRoleRequest, ServerPermissionCreate, ServerPermissionOut
from app.api.activity import log_activity

router = APIRouter(prefix="/api", tags=["users"])


# ---- Global user management ----

@router.get("/users", response_model=list[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(User).order_by(User.created_at))
    return result.scalars().all()


@router.post("/users/{user_id}/role", response_model=UserOut)
async def set_user_role(
    user_id: int,
    data: SetRoleRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.OWNER)),
):
    # Validate role
    try:
        new_role = UserRole(data.role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid role: {data.role}")

    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if target.id == _user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    old_role = target.role
    target.role = new_role.value
    target.is_admin = new_role in (UserRole.OWNER, UserRole.ADMIN)

    await log_activity(
        db,
        user_id=_user.id,
        action=ActionType.ROLE_CHANGE,
        detail=f"Changed {target.username} role from {old_role} to {new_role.value}",
    )
    await db.commit()
    await db.refresh(target)
    return target


# ---- Per-server permissions ----

@router.get("/servers/{server_id}/permissions", response_model=list[ServerPermissionOut])
async def list_server_permissions(
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.ADMIN)),
):
    result = await db.execute(
        select(ServerPermission).where(ServerPermission.server_id == server_id)
    )
    perms = result.scalars().all()
    return [
        ServerPermissionOut(
            id=p.id,
            user_id=p.user_id,
            server_id=p.server_id,
            role=p.role,
            username=p.user.username if p.user else None,
            created_at=p.created_at,
        )
        for p in perms
    ]


@router.post("/servers/{server_id}/permissions", response_model=ServerPermissionOut, status_code=status.HTTP_201_CREATED)
async def grant_server_permission(
    server_id: int,
    data: ServerPermissionCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.ADMIN)),
):
    # Validate role
    try:
        ServerRole(data.role)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid server role: {data.role}. Must be ADMIN, MODERATOR, or VIEWER")

    # Check user exists
    result = await db.execute(select(User).where(User.id == data.user_id))
    target_user = result.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check for existing permission
    result = await db.execute(
        select(ServerPermission).where(
            ServerPermission.user_id == data.user_id,
            ServerPermission.server_id == server_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        # Update existing
        existing.role = data.role
        perm = existing
    else:
        perm = ServerPermission(
            user_id=data.user_id,
            server_id=server_id,
            role=data.role,
        )
        db.add(perm)

    await log_activity(
        db,
        server_id=server_id,
        user_id=_user.id,
        action=ActionType.PERMISSION_GRANT,
        detail=f"Granted {target_user.username} {data.role} access",
    )
    await db.commit()
    await db.refresh(perm)
    # Re-fetch to get user relationship
    result = await db.execute(select(ServerPermission).where(ServerPermission.id == perm.id))
    perm = result.scalar_one()
    return ServerPermissionOut(
        id=perm.id,
        user_id=perm.user_id,
        server_id=perm.server_id,
        role=perm.role,
        username=perm.user.username if perm.user else None,
        created_at=perm.created_at,
    )


@router.delete("/servers/{server_id}/permissions/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_server_permission(
    server_id: int,
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_server_access(UserRole.ADMIN)),
):
    result = await db.execute(
        select(ServerPermission).where(
            ServerPermission.user_id == user_id,
            ServerPermission.server_id == server_id,
        )
    )
    perm = result.scalar_one_or_none()
    if not perm:
        raise HTTPException(status_code=404, detail="Permission not found")

    username = perm.user.username if perm.user else f"user#{user_id}"
    await log_activity(
        db,
        server_id=server_id,
        user_id=_user.id,
        action=ActionType.PERMISSION_REVOKE,
        detail=f"Revoked {username} access",
    )
    await db.delete(perm)
    await db.commit()
