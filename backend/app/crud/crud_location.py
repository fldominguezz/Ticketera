from typing import List, Optional, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.db.models.location import LocationNode
from app.schemas.location import LocationNodeCreate, LocationNodeUpdate

class CRUDLocation:
    async def get(self, db: AsyncSession, id: UUID) -> Optional[LocationNode]:
        result = await db.execute(select(LocationNode).filter(LocationNode.id == id))
        return result.scalar_one_or_none()
    
    async def get_all(self, db: AsyncSession) -> List[LocationNode]:
        result = await db.execute(select(LocationNode))
        return result.scalars().all()

    async def create(self, db: AsyncSession, obj_in: LocationNodeCreate) -> LocationNode:
        db_obj = LocationNode(**obj_in.model_dump())
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(self, db: AsyncSession, db_obj: LocationNode, obj_in: LocationNodeUpdate) -> LocationNode:
        old_name = db_obj.name
        old_path = db_obj.path
        
        update_data = obj_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)
        
        # Si el nombre cambió, debemos recalcular el path de este nodo y de todos sus hijos
        if "name" in update_data and update_data["name"] != old_name:
            # Recalcular path de este nodo
            if db_obj.parent_id:
                parent = await self.get(db, db_obj.parent_id)
                db_obj.path = f"{parent.path}/{db_obj.name}" if parent else db_obj.name
            else:
                db_obj.path = db_obj.name
            
            # Guardar el nuevo path para actualizar a los hijos
            new_path = db_obj.path
            
            # Buscar todos los hijos (recursivamente buscando por el rastro del path antiguo)
            # Nota: Esto es una simplificación. En prod podrías usar una función recursiva.
            result = await db.execute(select(LocationNode).filter(LocationNode.path.like(f"{old_path}/%")))
            children = result.scalars().all()
            
            for child in children:
                child.path = child.path.replace(old_path, new_path, 1)
                db.add(child)

        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def delete(self, db: AsyncSession, id: UUID) -> Optional[LocationNode]:
        obj = await self.get(db, id)
        if obj:
            await db.delete(obj)
            await db.commit()
        return obj

    # Helper to build tree could be here or in service layer
    # For now, just CRUD.

location = CRUDLocation()
