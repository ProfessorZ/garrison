import logging
import secrets
from urllib.parse import urlencode

import aiohttp
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.auth.security import hash_password, verify_password, create_access_token, decode_access_token
from app.config import settings
from app.database import get_db
from app.models.user import User, UserRole
from app.models.activity_log import ActionType
from app.schemas.user import UserCreate, UserOut, Token, DiscordLinkRequest
from app.api.activity import log_activity

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

DISCORD_API_BASE = "https://discord.com/api/v10"
DISCORD_AUTHORIZE_URL = "https://discord.com/api/oauth2/authorize"
DISCORD_TOKEN_URL = f"{DISCORD_API_BASE}/oauth2/token"


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


# --- Discord OAuth2 ---

@router.get("/discord/enabled")
async def discord_oauth_enabled():
    """Check if Discord OAuth2 is configured."""
    return {"enabled": bool(settings.DISCORD_CLIENT_ID and settings.DISCORD_CLIENT_SECRET)}


@router.get("/discord/authorize")
async def discord_authorize(user: User = Depends(get_current_user)):
    """Generate Discord OAuth2 authorization URL."""
    if not settings.DISCORD_CLIENT_ID or not settings.DISCORD_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="Discord OAuth2 is not configured")

    # State param: JWT containing user ID + random nonce for CSRF protection
    nonce = secrets.token_urlsafe(16)
    state = create_access_token({"sub": user.username, "nonce": nonce, "purpose": "discord_oauth"})

    params = urlencode({
        "client_id": settings.DISCORD_CLIENT_ID,
        "redirect_uri": settings.DISCORD_REDIRECT_URI,
        "response_type": "code",
        "scope": "identify",
        "state": state,
        "prompt": "consent",
    })
    return {"url": f"{DISCORD_AUTHORIZE_URL}?{params}"}


@router.get("/discord/callback")
async def discord_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    error_description: str = Query(None),
):
    """Handle Discord OAuth2 callback — exchange code, link account, redirect to frontend."""
    frontend_base = settings.CORS_ORIGINS.split(",")[0].strip()

    # User cancelled or Discord returned an error
    if error:
        logger.warning("Discord OAuth2 error: %s — %s", error, error_description)
        return RedirectResponse(f"{frontend_base}/settings?discord=error&reason={error}")

    if not code or not state:
        return RedirectResponse(f"{frontend_base}/settings?discord=error&reason=missing_params")

    # Validate state (CSRF protection)
    payload = decode_access_token(state)
    if not payload or payload.get("purpose") != "discord_oauth":
        return RedirectResponse(f"{frontend_base}/settings?discord=error&reason=invalid_state")

    username = payload.get("sub")
    if not username:
        return RedirectResponse(f"{frontend_base}/settings?discord=error&reason=invalid_state")

    try:
        # Exchange code for access token
        async with aiohttp.ClientSession() as session:
            async with session.post(
                DISCORD_TOKEN_URL,
                data={
                    "client_id": settings.DISCORD_CLIENT_ID,
                    "client_secret": settings.DISCORD_CLIENT_SECRET,
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": settings.DISCORD_REDIRECT_URI,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            ) as resp:
                if resp.status != 200:
                    body = await resp.text()
                    logger.error("Discord token exchange failed (%d): %s", resp.status, body)
                    return RedirectResponse(f"{frontend_base}/settings?discord=error&reason=token_exchange_failed")
                token_data = await resp.json()

            # Fetch Discord user info
            access_token = token_data["access_token"]
            async with session.get(
                f"{DISCORD_API_BASE}/users/@me",
                headers={"Authorization": f"Bearer {access_token}"},
            ) as resp:
                if resp.status != 200:
                    logger.error("Discord user fetch failed (%d)", resp.status)
                    return RedirectResponse(f"{frontend_base}/settings?discord=error&reason=user_fetch_failed")
                discord_user = await resp.json()

        discord_id = discord_user["id"]
        discord_username = discord_user.get("username", "")
        discord_avatar = discord_user.get("avatar")

        # Link to Garrison user
        from app.database import async_session as session_factory
        async with session_factory() as db:
            # Find the authenticated user
            result = await db.execute(select(User).where(User.username == username))
            user = result.scalar_one_or_none()
            if not user:
                return RedirectResponse(f"{frontend_base}/settings?discord=error&reason=user_not_found")

            # Check if this Discord ID is already linked to a different user
            existing = await db.execute(
                select(User).where(User.discord_id == discord_id, User.id != user.id)
            )
            if existing.scalar_one_or_none():
                return RedirectResponse(f"{frontend_base}/settings?discord=error&reason=already_linked")

            user.discord_id = discord_id
            user.discord_username = discord_username
            user.discord_avatar = discord_avatar
            db.add(user)
            await db.commit()

        logger.info("Discord account linked: %s -> %s (%s)", username, discord_username, discord_id)
        return RedirectResponse(f"{frontend_base}/settings?discord=success")

    except Exception:
        logger.exception("Discord OAuth2 callback failed")
        return RedirectResponse(f"{frontend_base}/settings?discord=error&reason=internal_error")


# --- Manual Discord linking ---

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
    user.discord_username = None
    user.discord_avatar = None
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
