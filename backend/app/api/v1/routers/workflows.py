from typing import List, Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from pydantic import BaseModel

from app.api.deps import get_db, require_permission
from app.db.models.workflow import WorkflowState, WorkflowTransition
from app.db.models.user import User

router = APIRouter()

# --- SCHEMAS ---
class StateSchema(BaseModel):
    id: UUID
    name: str
    status_key: str
    color: Optional[str] = "#6c757d"
    is_initial: bool
    is_final: bool
    class Config:
        from_attributes = True

class TransitionSchema(BaseModel):
    id: UUID
    name: str
    from_state_id: UUID
    to_state_id: UUID
    class Config:
        from_attributes = True

class StateCreate(BaseModel):
    name: str
    status_key: str
    color: str = "#6c757d"
    is_initial: bool = False
    is_final: bool = False

# --- ENDPOINTS ---

@router.get("/states", response_model=List[StateSchema])
async def list_global_states(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:catalogs:read"))]
):
    """Listar todos los estados de tickets disponibles."""
    result = await db.execute(select(WorkflowState).order_by(WorkflowState.name))
    return result.scalars().all()

@router.post("/states", response_model=StateSchema)
async def create_global_state(
    state_in: StateCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:catalogs:manage"))]
):
    """Crear un nuevo estado para los tickets."""
    db_state = WorkflowState(**state_in.model_dump())
    db.add(db_state)
    await db.commit()
    await db.refresh(db_state)
    return db_state

@router.get("/transitions", response_model=List[TransitionSchema])
async def list_global_transitions(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:catalogs:read"))]
):
    """Listar todas las flechas de movimiento permitidas."""
    result = await db.execute(select(WorkflowTransition))
    return result.scalars().all()

@router.post("/transitions")
async def create_global_transition(
    from_id: UUID,
    to_id: UUID,
    name: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:catalogs:manage"))]
):
    """Definir un nuevo movimiento permitido entre estados."""
    db_trans = WorkflowTransition(from_state_id=from_id, to_state_id=to_id, name=name)
    db.add(db_trans)
    await db.commit()
    return {"status": "success"}

@router.delete("/transitions/{trans_id}")
async def delete_transition(
    trans_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:catalogs:manage"))]
):
    """Eliminar una regla de movimiento."""
    from sqlalchemy import delete
    await db.execute(delete(WorkflowTransition).where(WorkflowTransition.id == trans_id))
    await db.commit()
    return {"status": "deleted"}
