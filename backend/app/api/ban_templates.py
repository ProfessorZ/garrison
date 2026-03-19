from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.deps import get_current_user
from app.auth.permissions import require_role
from app.database import get_db
from app.models.ban_template import BanTemplate
from app.models.user import User, UserRole
from app.schemas.ban_template import BanTemplateCreate, BanTemplateOut

router = APIRouter(prefix="/api/ban-templates", tags=["ban-templates"])


@router.get("", response_model=list[BanTemplateOut])
async def list_ban_templates(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(BanTemplate).order_by(BanTemplate.name)
    )
    templates = result.scalars().all()

    user_ids = {t.created_by_user_id for t in templates if t.created_by_user_id}
    user_names: dict[int, str] = {}
    if user_ids:
        usr_result = await db.execute(select(User).where(User.id.in_(user_ids)))
        for u in usr_result.scalars():
            user_names[u.id] = u.username

    return [
        BanTemplateOut(
            id=t.id,
            name=t.name,
            reason_template=t.reason_template,
            duration_hours=t.duration_hours,
            created_by_user_id=t.created_by_user_id,
            created_by_username=user_names.get(t.created_by_user_id) if t.created_by_user_id else None,
            created_at=t.created_at,
        )
        for t in templates
    ]


@router.post("", response_model=BanTemplateOut)
async def create_ban_template(
    body: BanTemplateCreate,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.MODERATOR)),
):
    template = BanTemplate(
        name=body.name,
        reason_template=body.reason_template,
        duration_hours=body.duration_hours,
        created_by_user_id=_user.id,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)

    return BanTemplateOut(
        id=template.id,
        name=template.name,
        reason_template=template.reason_template,
        duration_hours=template.duration_hours,
        created_by_user_id=template.created_by_user_id,
        created_by_username=_user.username,
        created_at=template.created_at,
    )


@router.delete("/{template_id}")
async def delete_ban_template(
    template_id: int,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(require_role(UserRole.MODERATOR)),
):
    result = await db.execute(select(BanTemplate).where(BanTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    await db.delete(template)
    await db.commit()
    return {"status": "ok"}
