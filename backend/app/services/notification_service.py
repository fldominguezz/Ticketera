from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.db.models.notifications import Notification
from app.schemas.notification import NotificationCreate

class NotificationService:
    async def create_notification(self, db: AsyncSession, obj_in: NotificationCreate) -> Notification:
        db_obj = Notification(**obj_in.model_dump())
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def notify_user(self, db: AsyncSession, user_id: UUID, title: str, message: str, link: str = None):
        obj_in = NotificationCreate(user_id=user_id, title=title, message=message, link=link)
        return await self.create_notification(db, obj_in)

    async def notify_all_active(self, db: AsyncSession, title: str, message: str, link: str = None):
        from app.db.models.user import User
        from sqlalchemy.future import select
        result = await db.execute(select(User).filter(User.is_active == True))
        users = result.scalars().all()
        for user in users:
            obj_in = NotificationCreate(user_id=user.id, title=title, message=message, link=link)
            db_obj = Notification(**obj_in.model_dump())
            db.add(db_obj)
        await db.commit()

notification_service = NotificationService()
