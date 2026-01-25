from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from app.api.deps import get_db, get_current_active_user
from app.db.models import User, Notification as NotificationModel
from app.schemas.notification import Notification, NotificationUpdate

router = APIRouter()

@router.get("", response_model=List[Notification])
async def read_notifications(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    unread_only: bool = False,
):
    query = select(NotificationModel).filter(NotificationModel.user_id == current_user.id)
    if unread_only:
        query = query.filter(NotificationModel.is_read == False)
    
    result = await db.execute(query.order_by(NotificationModel.created_at.desc()))
    return result.scalars().all()

@router.patch("/{notification_id}", response_model=Notification)
async def update_notification(
    notification_id: UUID,
    notif_in: NotificationUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    result = await db.execute(select(NotificationModel).filter(NotificationModel.id == notification_id, NotificationModel.user_id == current_user.id))
    db_obj = result.scalar_one_or_none()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    db_obj.is_read = notif_in.is_read
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.post("/mark-all-read")
async def mark_all_read(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    from sqlalchemy import update
    await db.execute(
        update(NotificationModel)
        .where(NotificationModel.user_id == current_user.id, NotificationModel.is_read == False)
        .values(is_read=True)
    )
    await db.commit()
    return {"status": "success"}
