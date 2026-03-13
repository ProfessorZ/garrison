import math

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.auth.permissions import require_role
from app.database import get_db
from app.models.ban_list import BanList, BanListEntry, ServerBanList
from app.models.server import Server
from app.models.known_player import KnownPlayer
from app.models.user import User, UserRole
from app.schemas.ban_list import (
    BanListCreate,
    BanListUpdate,
    BanListOut,
    BanListDetailOut,
    BanListEntryCreate,
    BanListEntryOut,
    BanListEntryList,
    ServerBanListCreate,
    ServerBanListOut,
)
from app.services.ban_list_service import ban_list_service

router = APIRouter(prefix="/api/ban-lists", tags=["ban-lists"])


async def _ban_list_to_out(db: AsyncSession, bl: BanList) -> BanListOut:
    entry_count = (await db.execute(
        select(func.count(BanListEntry.id)).where(BanListEntry.ban_list_id == bl.id, BanListEntry.is_active == True)  # noqa: E712
    )).scalar() or 0
    server_count = (await db.execute(
        select(func.count(ServerBanList.id)).where(ServerBanList.ban_list_id == bl.id)
    )).scalar() or 0

    username = None
    if bl.created_by_user_id:
        u_result = await db.execute(select(User.username).where(User.id == bl.created_by_user_id))
        username = u_result.scalar_one_or_none()

    return BanListOut(
        id=bl.id,
        name=bl.name,
        description=bl.description,
        is_global=bl.is_global,
        created_by_user_id=bl.created_by_user_id,
        created_by_username=username,
        entry_count=entry_count,
        server_count=server_count,
        created_at=bl.created_at,
        updated_at=bl.updated_at,
    )


# --- Ban Lists ---

@router.get("", response_model=list[BanListOut])
async def list_ban_lists(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(BanList).order_by(BanList.name))
    ban_lists = result.scalars().all()
    return [await _ban_list_to_out(db, bl) for bl in ban_lists]


@router.post("", response_model=BanListOut)
async def create_ban_list(
    body: BanListCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.MODERATOR)),
):
    bl = BanList(
        name=body.name,
        description=body.description,
        is_global=body.is_global,
        created_by_user_id=_user.id,
    )
    db.add(bl)
    await db.commit()
    await db.refresh(bl)
    return await _ban_list_to_out(db, bl)


@router.get("/{ban_list_id}", response_model=BanListDetailOut)
async def get_ban_list(
    ban_list_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(select(BanList).where(BanList.id == ban_list_id))
    bl = result.scalar_one_or_none()
    if not bl:
        raise HTTPException(status_code=404, detail="Ban list not found")

    out = await _ban_list_to_out(db, bl)

    # Get server assignments
    sbl_result = await db.execute(
        select(ServerBanList).where(ServerBanList.ban_list_id == ban_list_id)
    )
    sbls = sbl_result.scalars().all()
    server_ids = {s.server_id for s in sbls}
    server_names = {}
    if server_ids:
        srv_result = await db.execute(select(Server).where(Server.id.in_(server_ids)))
        for srv in srv_result.scalars():
            server_names[srv.id] = srv.name

    servers = [
        ServerBanListOut(
            server_id=s.server_id,
            server_name=server_names.get(s.server_id),
            ban_list_id=s.ban_list_id,
            auto_enforce=s.auto_enforce,
            added_at=s.added_at,
        )
        for s in sbls
    ]

    return BanListDetailOut(
        **out.model_dump(),
        servers=servers,
    )


@router.put("/{ban_list_id}", response_model=BanListOut)
async def update_ban_list(
    ban_list_id: int,
    body: BanListUpdate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.MODERATOR)),
):
    result = await db.execute(select(BanList).where(BanList.id == ban_list_id))
    bl = result.scalar_one_or_none()
    if not bl:
        raise HTTPException(status_code=404, detail="Ban list not found")

    if body.name is not None:
        bl.name = body.name
    if body.description is not None:
        bl.description = body.description
    if body.is_global is not None:
        bl.is_global = body.is_global

    await db.commit()
    await db.refresh(bl)
    return await _ban_list_to_out(db, bl)


@router.delete("/{ban_list_id}")
async def delete_ban_list(
    ban_list_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.ADMIN)),
):
    result = await db.execute(select(BanList).where(BanList.id == ban_list_id))
    bl = result.scalar_one_or_none()
    if not bl:
        raise HTTPException(status_code=404, detail="Ban list not found")

    await db.delete(bl)
    await db.commit()
    return {"status": "ok"}


# --- Entries ---

@router.get("/{ban_list_id}/entries", response_model=BanListEntryList)
async def list_entries(
    ban_list_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(25, ge=1, le=100),
    search: str = Query(""),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    base = select(BanListEntry).where(BanListEntry.ban_list_id == ban_list_id)
    count_q = select(func.count(BanListEntry.id)).where(BanListEntry.ban_list_id == ban_list_id)

    if search:
        pattern = f"%{search}%"
        base = base.where(BanListEntry.player_name.ilike(pattern))
        count_q = count_q.where(BanListEntry.player_name.ilike(pattern))

    total = (await db.execute(count_q)).scalar() or 0
    pages = max(1, math.ceil(total / per_page))
    offset = (page - 1) * per_page

    result = await db.execute(
        base.order_by(BanListEntry.added_at.desc()).offset(offset).limit(per_page)
    )
    entries = result.scalars().all()

    # Resolve usernames
    user_ids = {e.added_by_user_id for e in entries if e.added_by_user_id}
    user_names = {}
    if user_ids:
        usr_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        for u in usr_result.scalars():
            user_names[u.id] = u.username

    items = [
        BanListEntryOut(
            id=e.id,
            ban_list_id=e.ban_list_id,
            player_id=e.player_id,
            player_name=e.player_name,
            reason=e.reason,
            added_by_user_id=e.added_by_user_id,
            added_by_username=user_names.get(e.added_by_user_id) if e.added_by_user_id else None,
            expires_at=e.expires_at,
            is_active=e.is_active,
            added_at=e.added_at,
            updated_at=e.updated_at,
        )
        for e in entries
    ]

    return BanListEntryList(items=items, total=total, page=page, per_page=per_page, pages=pages)


@router.post("/{ban_list_id}/entries", response_model=BanListEntryOut)
async def add_entry(
    ban_list_id: int,
    body: BanListEntryCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.MODERATOR)),
):
    # Verify ban list exists
    bl = (await db.execute(select(BanList).where(BanList.id == ban_list_id))).scalar_one_or_none()
    if not bl:
        raise HTTPException(status_code=404, detail="Ban list not found")

    # Try to link to known player if player_id not provided
    player_id = body.player_id
    if not player_id:
        kp = (await db.execute(
            select(KnownPlayer).where(KnownPlayer.name == body.player_name)
        )).scalar_one_or_none()
        if kp:
            player_id = kp.id

    entry = BanListEntry(
        ban_list_id=ban_list_id,
        player_id=player_id,
        player_name=body.player_name,
        reason=body.reason,
        expires_at=body.expires_at,
        added_by_user_id=_user.id,
        is_active=True,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)

    return BanListEntryOut(
        id=entry.id,
        ban_list_id=entry.ban_list_id,
        player_id=entry.player_id,
        player_name=entry.player_name,
        reason=entry.reason,
        added_by_user_id=entry.added_by_user_id,
        added_by_username=_user.username,
        expires_at=entry.expires_at,
        is_active=entry.is_active,
        added_at=entry.added_at,
        updated_at=entry.updated_at,
    )


@router.delete("/{ban_list_id}/entries/{entry_id}")
async def remove_entry(
    ban_list_id: int,
    entry_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.MODERATOR)),
):
    result = await db.execute(
        select(BanListEntry).where(
            BanListEntry.id == entry_id,
            BanListEntry.ban_list_id == ban_list_id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")

    await db.delete(entry)
    await db.commit()
    return {"status": "ok"}


# --- Server Assignment ---

@router.get("/{ban_list_id}/servers", response_model=list[ServerBanListOut])
async def list_servers(
    ban_list_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ServerBanList).where(ServerBanList.ban_list_id == ban_list_id)
    )
    sbls = result.scalars().all()

    server_ids = {s.server_id for s in sbls}
    server_names = {}
    if server_ids:
        srv_result = await db.execute(select(Server).where(Server.id.in_(server_ids)))
        for srv in srv_result.scalars():
            server_names[srv.id] = srv.name

    return [
        ServerBanListOut(
            server_id=s.server_id,
            server_name=server_names.get(s.server_id),
            ban_list_id=s.ban_list_id,
            auto_enforce=s.auto_enforce,
            added_at=s.added_at,
        )
        for s in sbls
    ]


@router.post("/{ban_list_id}/servers", response_model=ServerBanListOut)
async def assign_server(
    ban_list_id: int,
    body: ServerBanListCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.MODERATOR)),
):
    # Verify both exist
    bl = (await db.execute(select(BanList).where(BanList.id == ban_list_id))).scalar_one_or_none()
    if not bl:
        raise HTTPException(status_code=404, detail="Ban list not found")
    srv = (await db.execute(select(Server).where(Server.id == body.server_id))).scalar_one_or_none()
    if not srv:
        raise HTTPException(status_code=404, detail="Server not found")

    # Check if already assigned
    existing = (await db.execute(
        select(ServerBanList).where(
            ServerBanList.ban_list_id == ban_list_id,
            ServerBanList.server_id == body.server_id,
        )
    )).scalar_one_or_none()
    if existing:
        existing.auto_enforce = body.auto_enforce
        await db.commit()
        await db.refresh(existing)
        return ServerBanListOut(
            server_id=existing.server_id,
            server_name=srv.name,
            ban_list_id=existing.ban_list_id,
            auto_enforce=existing.auto_enforce,
            added_at=existing.added_at,
        )

    sbl = ServerBanList(
        ban_list_id=ban_list_id,
        server_id=body.server_id,
        auto_enforce=body.auto_enforce,
    )
    db.add(sbl)
    await db.commit()
    await db.refresh(sbl)

    return ServerBanListOut(
        server_id=sbl.server_id,
        server_name=srv.name,
        ban_list_id=sbl.ban_list_id,
        auto_enforce=sbl.auto_enforce,
        added_at=sbl.added_at,
    )


@router.delete("/{ban_list_id}/servers/{server_id}")
async def unassign_server(
    ban_list_id: int,
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.MODERATOR)),
):
    result = await db.execute(
        select(ServerBanList).where(
            ServerBanList.ban_list_id == ban_list_id,
            ServerBanList.server_id == server_id,
        )
    )
    sbl = result.scalar_one_or_none()
    if not sbl:
        raise HTTPException(status_code=404, detail="Server assignment not found")

    await db.delete(sbl)
    await db.commit()
    return {"status": "ok"}


# --- Sync + Import/Export ---

@router.post("/{ban_list_id}/sync/{server_id}")
async def sync_to_server(
    ban_list_id: int,
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.MODERATOR)),
):
    try:
        count = await ban_list_service.sync_to_server(db, server_id, ban_list_id)
        return {"status": "ok", "synced": count}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {e}")


@router.post("/{ban_list_id}/import/{server_id}")
async def import_from_server(
    ban_list_id: int,
    server_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.MODERATOR)),
):
    try:
        count = await ban_list_service.import_from_server(db, server_id, ban_list_id, _user.id)
        return {"status": "ok", "imported": count}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {e}")


@router.get("/{ban_list_id}/export.csv")
async def export_csv(
    ban_list_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    bl = (await db.execute(select(BanList).where(BanList.id == ban_list_id))).scalar_one_or_none()
    if not bl:
        raise HTTPException(status_code=404, detail="Ban list not found")

    csv_content = await ban_list_service.export_csv(db, ban_list_id)

    import io
    return StreamingResponse(
        io.StringIO(csv_content),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{bl.name}.csv"'},
    )


@router.post("/{ban_list_id}/import-csv")
async def import_csv(
    ban_list_id: int,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.MODERATOR)),
):
    bl = (await db.execute(select(BanList).where(BanList.id == ban_list_id))).scalar_one_or_none()
    if not bl:
        raise HTTPException(status_code=404, detail="Ban list not found")

    content = (await file.read()).decode("utf-8")
    count = await ban_list_service.import_csv(db, ban_list_id, content, _user.id)
    return {"status": "ok", "imported": count}
