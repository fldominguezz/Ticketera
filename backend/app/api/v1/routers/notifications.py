from typing import List, Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, func
from app.api.deps import get_db, get_current_active_user
from app.db.models import User, Notification as NotificationModel
from app.schemas.notification import Notification, NotificationUpdate
import uuid

router = APIRouter()

@router.get("/me", response_model=List[Notification])
async def get_my_notifications(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    limit: int = 20
):
    result = await db.execute(
        select(NotificationModel)
        .filter(NotificationModel.user_id == current_user.id)
        .order_by(NotificationModel.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()

@router.get("/unread-count")
async def get_unread_count(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    result = await db.execute(
        select(func.count(NotificationModel.id))
        .filter(NotificationModel.user_id == current_user.id, NotificationModel.is_read == False)
    )
    return {"count": result.scalar() or 0}

@router.post("/read-all")
async def mark_all_as_read(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    await db.execute(
        update(NotificationModel)
        .filter(NotificationModel.user_id == current_user.id)
        .values(is_read=True)
    )
    await db.commit()
    return {"status": "success"}

@router.patch("/{notification_id}/read")
async def mark_as_read(
    notification_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)]
):
    result = await db.execute(
        select(NotificationModel).filter(NotificationModel.id == notification_id, NotificationModel.user_id == current_user.id)
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")
    
    notif.is_read = True
    await db.commit()
    return {"status": "success"}