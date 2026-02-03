from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from app.db.models.notifications import Attachment

class CRUDAttachment:
    async def get(self, db: AsyncSession, id: UUID) -> Optional[Attachment]:
        result = await db.execute(select(Attachment).filter(Attachment.id == id))
        return result.scalar_one_or_none()

    async def get_multi_by_ticket(self, db: AsyncSession, ticket_id: UUID) -> List[Attachment]:
        result = await db.execute(select(Attachment).filter(Attachment.ticket_id == ticket_id))
        return result.scalars().all()

attachment = CRUDAttachment()
