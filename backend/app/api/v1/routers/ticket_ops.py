from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID

from app.api.deps import get_db, get_current_active_user
from app.db.models import User
from app.db.models.ticket import TicketSubtask, TicketWatcher
from pydantic import BaseModel, ConfigDict

router = APIRouter()

class SubtaskSchema(BaseModel):
    id: UUID
    title: str
    is_completed: bool
    model_config = ConfigDict(from_attributes=True)

class SubtaskUpdate(BaseModel):
    is_completed: bool

@router.post("/{ticket_id}/subtasks", response_model=SubtaskSchema)
async def create_subtask(
    ticket_id: UUID,
    title: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    sub = TicketSubtask(ticket_id=ticket_id, title=title)
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return sub

@router.patch("/subtasks/{subtask_id}", response_model=SubtaskSchema)
async def update_subtask(
    subtask_id: UUID,
    sub_in: SubtaskUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    result = await db.execute(select(TicketSubtask).filter(TicketSubtask.id == subtask_id))
    sub = result.scalar_one_or_none()
    if not sub: raise HTTPException(status_code=404)
    sub.is_completed = sub_in.is_completed
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return sub

@router.post("/{ticket_id}/watchers")
async def add_watcher(
    ticket_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    watcher = TicketWatcher(ticket_id=ticket_id, user_id=current_user.id)
    db.add(watcher)
    await db.commit()
    return {"status": "success"}
