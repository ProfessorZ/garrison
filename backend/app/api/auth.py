from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.auth.security import hash_password, verify_password, create_access_token
from app.database import get_db
from app.models.user import User, UserRole
from app.models.activity_log import ActionType
from app.schemas.user import UserCreate, UserOut, Token, DiscordLinkRequest
from app.api.activity import log_activity

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == data.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")
    count = (await db.execute(select(User))).scalars().all()
    is_first = len(count) == 0
    user = User(
        username=data.username,
        hashed_password=hash_password(data.password),
        is_admin=is_first,
        role=UserRole.OWNER.value if is_first else UserRole.VIEWER.value,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=Token)
async def login(data: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    await log_activity(db, user_id=user.id, action=ActionType.LOGIN, detail=f"User {user.username} logged in")
    await db.commit()
    token = create_access_token({"sub": user.username})
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user


@router.put("/discord-link", response_model=UserOut)
async def link_discord(
    data: DiscordLinkRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    discord_id = data.discord_id.strip()
    if not discord_id.isdigit() or len(discord_id) < 17 or len(discord_id) > 20:
        raise HTTPException(status_code=400, detail="Invalid Discord ID — must be a 17-20 digit snowflake")
    # Check if already taken by another user
    existing = await db.execute(select(User).where(User.discord_id == discord_id, User.id != user.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This Discord ID is already linked to another account")
    user.discord_id = discord_id
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.delete("/discord-link", response_model=UserOut)
async def unlink_discord(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user.discord_id = None
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
