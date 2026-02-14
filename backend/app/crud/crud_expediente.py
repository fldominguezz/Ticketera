from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models.expediente import Expediente
from app.schemas.expediente import ExpedienteCreate, ExpedienteUpdate
from uuid import UUID
class CRUDExpediente:
    async def get(self, db: AsyncSession, id: UUID) -> Optional[Expediente]:
        result = await db.execute(select(Expediente).where(Expediente.id == id))
        return result.scalar_one_or_none()
    async def get_multi(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Expediente]:
        result = await db.execute(select(Expediente).offset(skip).limit(limit))
        return result.scalars().all()
    async def get_by_number(self, db: AsyncSession, *, number: str) -> Optional[Expediente]:
        result = await db.execute(select(Expediente).where(Expediente.number == number))
        return result.scalar_one_or_none()
    async def search(self, db: AsyncSession, *, query: str, limit: int = 10) -> List[Expediente]:
        stmt = select(Expediente).where(
            (Expediente.number.ilike(f"%{query}%")) | 
            (Expediente.title.ilike(f"%{query}%"))
        ).limit(limit)
        result = await db.execute(stmt)
        return result.scalars().all()
    async def create(self, db: AsyncSession, *, obj_in: ExpedienteCreate) -> Expediente:
        db_obj = Expediente(
            number=obj_in.number,
            title=obj_in.title,
            description=obj_in.description,
            status=obj_in.status
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
    async def update(self, db: AsyncSession, *, db_obj: Expediente, obj_in: ExpedienteUpdate) -> Expediente:
        update_data = obj_in.dict(exclude_unset=True)
        for field in update_data:
            setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj
expediente = CRUDExpediente()