from typing import Annotated, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from app.api.deps import get_db, require_permission
from app.crud import crud_expediente
from app.db import models
from app.schemas.expediente import Expediente, ExpedienteCreate, ExpedienteUpdate
router = APIRouter()
@router.get("/", response_model=List[Expediente])
async def read_expedientes(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[models.User, Depends(require_permission("tickets.read"))],
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None
):
    if q:
        return await crud_expediente.expediente.search(db, query=q, limit=limit)
    return await crud_expediente.expediente.get_multi(db, skip=skip, limit=limit)
@router.post("/", response_model=Expediente, status_code=status.HTTP_201_CREATED)
async def create_expediente(
    *,
    db: Annotated[AsyncSession, Depends(get_db)],
    expediente_in: ExpedienteCreate,
    current_user: Annotated[models.User, Depends(require_permission("ticket:create"))]
):
    existing = await crud_expediente.expediente.get_by_number(db, number=expediente_in.number)
    if existing:
        raise HTTPException(status_code=400, detail="Expediente with this number already exists")
    return await crud_expediente.expediente.create(db, obj_in=expediente_in)
@router.get("/{expediente_id}", response_model=Expediente)
async def read_expediente(
    expediente_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[models.User, Depends(require_permission("tickets.read"))]
):
    expediente = await crud_expediente.expediente.get(db, id=expediente_id)
    if not expediente:
        raise HTTPException(status_code=404, detail="Expediente not found")
    return expediente
@router.put("/{expediente_id}", response_model=Expediente)
async def update_expediente(
    expediente_id: UUID,
    expediente_in: ExpedienteUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[models.User, Depends(require_permission("tickets.update"))]
):
    expediente = await crud_expediente.expediente.get(db, id=expediente_id)
    if not expediente:
        raise HTTPException(status_code=404, detail="Expediente not found")
    return await crud_expediente.expediente.update(db, db_obj=expediente, obj_in=expediente_in)
