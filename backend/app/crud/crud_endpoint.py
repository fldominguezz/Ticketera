from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from app.db.models.endpoint import Endpoint
from app.schemas.endpoint import EndpointCreate, EndpointUpdate
class CRUDEndpoint:
    async def get(self, db: AsyncSession, id: UUID) -> Optional[Endpoint]:
        result = await db.execute(select(Endpoint).filter(Endpoint.id == id, Endpoint.deleted_at == None))
        return result.scalar_one_or_none()
    async def get_multi(self, db: AsyncSession, skip: int = 0, limit: int = 100) -> List[Endpoint]:
        result = await db.execute(select(Endpoint).filter(Endpoint.deleted_at == None).offset(skip).limit(limit))
        return result.scalars().all()
    async def create(self, db: AsyncSession, obj_in: EndpointCreate) -> Endpoint:
        db_obj = Endpoint(**obj_in.model_dump())
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj, attribute_names=[
            "id", "hostname", "ip_address", "mac_address", "group_id", 
            "product", "status", "technical_user_id", "observations", 
            "extra_data", "created_at", "updated_at"
        ])
        return db_obj
    async def update(self, db: AsyncSession, db_obj: Endpoint, obj_in: EndpointUpdate) -> Endpoint:
        for var, value in obj_in.model_dump(exclude_unset=True).items():
            setattr(db_obj, var, value)
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj, attribute_names=[
            "id", "hostname", "ip_address", "mac_address", "group_id", 
            "product", "status", "technical_user_id", "observations", 
            "extra_data", "created_at", "updated_at"
        ])
        return db_obj
    async def remove(self, db: AsyncSession, id: UUID) -> Endpoint:
        # Soft delete
        db_obj = await self.get(db, id)
        if db_obj:
            from sqlalchemy.sql import func
            db_obj.deleted_at = func.now()
            db_obj.status = "decommissioned"
            db.add(db_obj)
            await db.commit()
            await db.refresh(db_obj, attribute_names=[
                "id", "hostname", "ip_address", "mac_address", "group_id", 
                "product", "status", "technical_user_id", "observations", 
                "extra_data", "created_at", "updated_at", "deleted_at"
            ])
        return db_obj
endpoint = CRUDEndpoint()