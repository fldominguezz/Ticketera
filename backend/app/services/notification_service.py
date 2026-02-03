from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from datetime import datetime

from app.db.models.notifications import Notification
from app.core.ws_manager import manager
import json

class NotificationService:
    async def notify_user(
        self, 
        db: AsyncSession, 
        user_id: UUID, 
        title: str, 
        message: str, 
        link: Optional[str] = None
    ):
        """
        Crea una notificación en DB y la envía por WebSocket en tiempo real.
        """
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            link=link,
            created_at=datetime.utcnow()
        )
        db.add(notification)
        await db.flush() # Para obtener el ID sin commitear todo aún
        
        # Enviar por WebSocket
        await manager.send_to_user({
            "type": "notification",
            "data": {
                "id": str(notification.id),
                "title": title,
                "message": message,
                "link": link,
                "created_at": notification.created_at.isoformat()
            }
        }, str(user_id))
        
        return notification

    async def get_unread(self, db: AsyncSession, user_id: UUID):
        result = await db.execute(
            select(Notification)
            .where(Notification.user_id == user_id, Notification.is_read == False)
            .order_by(Notification.created_at.desc())
        )
        return result.scalars().all()

    async def mark_as_read(self, db: AsyncSession, notification_id: UUID):
        result = await db.execute(select(Notification).where(Notification.id == notification_id))
        notification = result.scalar_one_or_none()
        if notification:
            notification.is_read = True
            await db.commit()
        return notification

notification_service = NotificationService()