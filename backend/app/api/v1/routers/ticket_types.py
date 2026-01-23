from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_db, get_current_active_user
from app.db.models import TicketType, User
from pydantic import BaseModel, ConfigDict
from uuid import UUID

router = APIRouter()

class TicketTypeSchema(BaseModel):
    id: UUID
    name: str
    color: str
    model_config = ConfigDict(from_attributes=True)

@router.get("/", response_model=List[TicketTypeSchema])
async def read_ticket_types(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    result = await db.execute(select(TicketType))
    return result.scalars().all()
