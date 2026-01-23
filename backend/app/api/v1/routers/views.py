from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from app.api.deps import get_db, get_current_active_user
from app.db.models import User
from app.db.models.views import SavedView
from pydantic import BaseModel, ConfigDict

router = APIRouter()

class SavedViewSchema(BaseModel):
    id: UUID
    name: str
    filters: dict
    icon: str
    model_config = ConfigDict(from_attributes=True)

class SavedViewCreate(BaseModel):
    name: str
    filters: dict
    icon: str = "Filter"

@router.get("/", response_model=List[SavedViewSchema])
async def list_views(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    from app.db.models import User
    result = await db.execute(select(SavedView).filter(SavedView.user_id == current_user.id))
    return result.scalars().all()

@router.post("/", response_model=SavedViewSchema)
async def create_view(
    view_in: SavedViewCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    db_obj = SavedView(**view_in.model_dump(), user_id=current_user.id)
    db.add(db_obj)
    await db.commit()
    await db.refresh(db_obj)
    return db_obj
