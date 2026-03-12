import math
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.auth.permissions import require_role
from app.database import get_db
from app.models.known_player import KnownPlayer
from app.models.player_session import PlayerSession
from app.models.player_ban import PlayerBan
from app.models.player_name import PlayerNameHistory
from app.models.server import Server
from app.models.user import User, UserRole
from app.schemas.known_player import (
    KnownPlayerOut,
    KnownPlayerList,
    PlayerSessionOut,
    PlayerSessionList,
    PlayerBanOut,
    PlayerNameHistoryOut,
    PlayerProfileOut,
    UpdateNotesRequest,
    CreateBanRequest,
)
from app.services.player_tracker import is_player_online, _server_players

router = APIRouter(prefix="/api/players", tags=["known-players"])


def _player_to_out(player: KnownPlayer) -> KnownPlayerOut:
    online, server_id = is_player_online(player.name)
    return KnownPlayerOut(
        id=player.id,
        name=player.name,
        first_seen=player.first_seen,
        last_seen=player.last_seen,
        total_playtime_seconds=player.total_playtime_seconds,
        session_count=player.session_count,
        is_banned=player.is_banned,
        ban_count=player.ban_count,
        notes=player.notes,
        is_online=online,
        current_server_id=server_id,
        created_at=player.created_at,
        updated_at=player.updated_at,
    )


@router.get("", response_model=KnownPlayerList)
async def list_players(
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    sort_by: str = Query("last_seen", pattern="^(last_seen|first_seen|total_playtime_seconds|session_count|name)$"),
    sort_dir: str = Query("desc", pattern="^(asc|desc)$"),
    status: str = Query("all", pattern="^(all|online|banned)$"),
    server_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    col = getattr(KnownPlayer, sort_by)
    order = col.asc() if sort_dir == "asc" else col.desc()

    base_query = select(KnownPlayer)
    count_query = select(func.count(KnownPlayer.id))

    # Status filter
    if status == "online":
        online_names: set[str] = set()
        for names in _server_players.values():
            online_names |= names
        if not online_names:
            return KnownPlayerList(items=[], total=0, page=page, per_page=per_page, pages=1)
        base_query = base_query.where(KnownPlayer.name.in_(online_names))
        count_query = count_query.where(KnownPlayer.name.in_(online_names))
    elif status == "banned":
        base_query = base_query.where(KnownPlayer.is_banned == True)  # noqa: E712
        count_query = count_query.where(KnownPlayer.is_banned == True)  # noqa: E712

    # Server filter
    if server_id is not None:
        has_session = select(PlayerSession.player_id).where(
            PlayerSession.server_id == server_id
        ).distinct().subquery()
        base_query = base_query.where(KnownPlayer.id.in_(select(has_session)))
        count_query = count_query.where(KnownPlayer.id.in_(select(has_session)))

    total = (await db.execute(count_query)).scalar() or 0
    pages = max(1, math.ceil(total / per_page))
    offset = (page - 1) * per_page

    result = await db.execute(
        base_query.order_by(order).offset(offset).limit(per_page)
    )
    players = result.scalars().all()

    # Resolve server names for online players
    server_names: dict[int, str] = {}
    for p_out in [_player_to_out(p) for p in players]:
        if p_out.current_server_id and p_out.current_server_id not in server_names:
            srv = await db.execute(select(Server.name).where(Server.id == p_out.current_server_id))
            sname = srv.scalar_one_or_none()
            if sname:
                server_names[p_out.current_server_id] = sname

    items = []
    for p in players:
        out = _player_to_out(p)
        if out.current_server_id:
            out.current_server_name = server_names.get(out.current_server_id)
        items.append(out)

    return KnownPlayerList(items=items, total=total, page=page, per_page=per_page, pages=pages)


@router.get("/search", response_model=KnownPlayerList)
async def search_players(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    pattern = f"%{q}%"
    where = KnownPlayer.name.ilike(pattern)

    total = (await db.execute(select(func.count(KnownPlayer.id)).where(where))).scalar() or 0
    pages = max(1, math.ceil(total / per_page))
    offset = (page - 1) * per_page

    result = await db.execute(
        select(KnownPlayer).where(where).order_by(KnownPlayer.last_seen.desc()).offset(offset).limit(per_page)
    )
    players = result.scalars().all()
    items = [_player_to_out(p) for p in players]

    return KnownPlayerList(items=items, total=total, page=page, per_page=per_page, pages=pages)


@router.get("/{player_id}", response_model=PlayerProfileOut)
async def get_player_profile(
    player_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(KnownPlayer).where(KnownPlayer.id == player_id))
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Recent sessions (last 10)
    sess_result = await db.execute(
        select(PlayerSession).where(PlayerSession.player_id == player_id)
        .order_by(PlayerSession.joined_at.desc()).limit(10)
    )
    sessions = sess_result.scalars().all()

    # Resolve server names for sessions
    server_ids = {s.server_id for s in sessions}
    server_names = {}
    if server_ids:
        srv_result = await db.execute(select(Server).where(Server.id.in_(server_ids)))
        for srv in srv_result.scalars():
            server_names[srv.id] = srv.name

    sessions_out = [
        PlayerSessionOut(
            id=s.id, player_id=s.player_id, server_id=s.server_id,
            server_name=server_names.get(s.server_id),
            joined_at=s.joined_at, left_at=s.left_at, duration_seconds=s.duration_seconds,
        )
        for s in sessions
    ]

    # Bans
    bans_result = await db.execute(
        select(PlayerBan).where(PlayerBan.player_id == player_id)
        .order_by(PlayerBan.banned_at.desc())
    )
    bans = bans_result.scalars().all()

    # Resolve ban user names
    user_ids = set()
    for b in bans:
        if b.banned_by_user_id:
            user_ids.add(b.banned_by_user_id)
        if b.unbanned_by_user_id:
            user_ids.add(b.unbanned_by_user_id)
    ban_server_ids = {b.server_id for b in bans if b.server_id}
    if ban_server_ids - server_ids:
        extra_srv = await db.execute(select(Server).where(Server.id.in_(ban_server_ids - server_ids)))
        for srv in extra_srv.scalars():
            server_names[srv.id] = srv.name

    user_names = {}
    if user_ids:
        from app.models.user import User as UserModel
        usr_result = await db.execute(select(UserModel).where(UserModel.id.in_(user_ids)))
        for u in usr_result.scalars():
            user_names[u.id] = u.username

    bans_out = [
        PlayerBanOut(
            id=b.id, player_id=b.player_id, server_id=b.server_id,
            server_name=server_names.get(b.server_id) if b.server_id else None,
            banned_by_user_id=b.banned_by_user_id,
            banned_by_username=user_names.get(b.banned_by_user_id) if b.banned_by_user_id else None,
            reason=b.reason, banned_at=b.banned_at, expires_at=b.expires_at,
            is_active=b.is_active, unbanned_at=b.unbanned_at,
            unbanned_by_user_id=b.unbanned_by_user_id,
            unbanned_by_username=user_names.get(b.unbanned_by_user_id) if b.unbanned_by_user_id else None,
        )
        for b in bans
    ]

    # Name history
    nh_result = await db.execute(
        select(PlayerNameHistory).where(PlayerNameHistory.player_id == player_id)
        .order_by(PlayerNameHistory.first_seen_with_name.desc())
    )
    name_history = [
        PlayerNameHistoryOut(
            id=n.id, player_id=n.player_id, name=n.name,
            first_seen_with_name=n.first_seen_with_name,
            last_seen_with_name=n.last_seen_with_name,
        )
        for n in nh_result.scalars()
    ]

    return PlayerProfileOut(
        player=_player_to_out(player),
        sessions=sessions_out,
        bans=bans_out,
        name_history=name_history,
    )


@router.get("/{player_id}/sessions", response_model=PlayerSessionList)
async def get_player_sessions(
    player_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(KnownPlayer).where(KnownPlayer.id == player_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Player not found")

    total = (await db.execute(
        select(func.count(PlayerSession.id)).where(PlayerSession.player_id == player_id)
    )).scalar() or 0
    pages = max(1, math.ceil(total / per_page))
    offset = (page - 1) * per_page

    sess_result = await db.execute(
        select(PlayerSession).where(PlayerSession.player_id == player_id)
        .order_by(PlayerSession.joined_at.desc()).offset(offset).limit(per_page)
    )
    sessions = sess_result.scalars().all()

    server_ids = {s.server_id for s in sessions}
    server_names = {}
    if server_ids:
        srv_result = await db.execute(select(Server).where(Server.id.in_(server_ids)))
        for srv in srv_result.scalars():
            server_names[srv.id] = srv.name

    items = [
        PlayerSessionOut(
            id=s.id, player_id=s.player_id, server_id=s.server_id,
            server_name=server_names.get(s.server_id),
            joined_at=s.joined_at, left_at=s.left_at, duration_seconds=s.duration_seconds,
        )
        for s in sessions
    ]

    return PlayerSessionList(items=items, total=total, page=page, per_page=per_page, pages=pages)


@router.get("/{player_id}/bans", response_model=list[PlayerBanOut])
async def get_player_bans(
    player_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(KnownPlayer).where(KnownPlayer.id == player_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Player not found")

    bans_result = await db.execute(
        select(PlayerBan).where(PlayerBan.player_id == player_id)
        .order_by(PlayerBan.banned_at.desc())
    )
    bans = bans_result.scalars().all()

    server_ids = {b.server_id for b in bans if b.server_id}
    server_names = {}
    if server_ids:
        srv_result = await db.execute(select(Server).where(Server.id.in_(server_ids)))
        for srv in srv_result.scalars():
            server_names[srv.id] = srv.name

    user_ids = set()
    for b in bans:
        if b.banned_by_user_id:
            user_ids.add(b.banned_by_user_id)
        if b.unbanned_by_user_id:
            user_ids.add(b.unbanned_by_user_id)
    user_names = {}
    if user_ids:
        usr_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        for u in usr_result.scalars():
            user_names[u.id] = u.username

    return [
        PlayerBanOut(
            id=b.id, player_id=b.player_id, server_id=b.server_id,
            server_name=server_names.get(b.server_id) if b.server_id else None,
            banned_by_user_id=b.banned_by_user_id,
            banned_by_username=user_names.get(b.banned_by_user_id) if b.banned_by_user_id else None,
            reason=b.reason, banned_at=b.banned_at, expires_at=b.expires_at,
            is_active=b.is_active, unbanned_at=b.unbanned_at,
            unbanned_by_user_id=b.unbanned_by_user_id,
            unbanned_by_username=user_names.get(b.unbanned_by_user_id) if b.unbanned_by_user_id else None,
        )
        for b in bans
    ]


@router.put("/{player_id}/notes")
async def update_notes(
    player_id: int,
    body: UpdateNotesRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.MODERATOR)),
):
    result = await db.execute(select(KnownPlayer).where(KnownPlayer.id == player_id))
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    player.notes = body.notes
    await db.commit()
    return {"status": "ok"}


@router.post("/{player_id}/ban")
async def ban_player(
    player_id: int,
    body: CreateBanRequest,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.MODERATOR)),
):
    result = await db.execute(select(KnownPlayer).where(KnownPlayer.id == player_id))
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    ban = PlayerBan(
        player_id=player_id,
        server_id=body.server_id,
        banned_by_user_id=_user.id,
        reason=body.reason,
        expires_at=body.expires_at,
        is_active=True,
    )
    db.add(ban)

    player.is_banned = True
    player.ban_count += 1

    await db.commit()
    return {"status": "ok", "ban_id": ban.id}


@router.post("/{player_id}/unban")
async def unban_player(
    player_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.MODERATOR)),
):
    result = await db.execute(select(KnownPlayer).where(KnownPlayer.id == player_id))
    player = result.scalar_one_or_none()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")

    # Deactivate all active bans
    bans_result = await db.execute(
        select(PlayerBan).where(
            PlayerBan.player_id == player_id,
            PlayerBan.is_active == True,  # noqa: E712
        )
    )
    now = datetime.now(timezone.utc)
    for ban in bans_result.scalars():
        ban.is_active = False
        ban.unbanned_at = now
        ban.unbanned_by_user_id = _user.id

    player.is_banned = False
    await db.commit()
    return {"status": "ok"}
