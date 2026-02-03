from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from pydantic import BaseModel, ConfigDict

from app.api.deps import get_db, require_permission, get_current_active_user
from app.db.models import TicketType, User

router = APIRouter()

class TicketTypeSchema(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class TicketTypeCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

@router.get(
    "",
    response_model=List[TicketTypeSchema]
)
async def read_ticket_types(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)], # Allow all authenticated users
):
    result = await db.execute(select(TicketType))
    return result.scalars().all()

@router.post(
    "",
    response_model=TicketTypeSchema,
    status_code=status.HTTP_201_CREATED
)
async def create_ticket_type(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:catalogs:manage"))],
    type_in: TicketTypeCreate
):
    db_obj = TicketType(**type_in.model_dump())
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.put(
    "/{type_id}",
    response_model=TicketTypeSchema
)
async def update_ticket_type(
    type_id: UUID,
    type_in: TicketTypeCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:catalogs:manage"))],
):
    result = await db.execute(select(TicketType).filter(TicketType.id == type_id))
    db_obj = result.scalar_one_or_none()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Type not found")
        
    for var, value in type_in.model_dump(exclude_unset=True).items():
        setattr(db_obj, var, value)
        
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj

@router.delete(
    "/{type_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_ticket_type(
    type_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:catalogs:manage"))],
):
    result = await db.execute(select(TicketType).filter(TicketType.id == type_id))
    db_obj = result.scalar_one_or_none()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Type not found")
        
    await db.delete(db_obj)
    await db.commit()
    return None
