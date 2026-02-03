from typing import List, Optional, Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_db, require_permission, get_current_active_user
from app.schemas.location import LocationNode as LocationSchema, LocationNodeCreate, LocationNodeUpdate
from app.crud.crud_location import location as crud_location
from app.db.models.user import User
from app.db.models.location import LocationNode as LocationModel

router = APIRouter()

@router.get(
    "",
    response_model=List[LocationSchema]
)
async def read_locations(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:locations:read"))],
    q: Optional[str] = Query(None, description="Buscar por nombre o código de dependencia")
):
    """
    Retorna la lista plana de dependencias/ubicaciones.
    """
    query = select(LocationModel)
    if q:
        query = query.filter(
            (LocationModel.name.ilike(f"%{q}%")) | 
            (LocationModel.dependency_code.ilike(f"%{q}%"))
        )
    
    from sqlalchemy import cast, Integer, case
    
    # Intelligent sorting: numeric codes first (ordered as integers), then non-numeric
    result = await db.execute(
        query.order_by(
            case(
                (LocationModel.dependency_code.op("~")("^[0-9]+$"), cast(LocationModel.dependency_code, Integer)),
                else_=999999
            ).asc(),
            LocationModel.dependency_code.asc()
        )
    )
    return result.scalars().all()

@router.post(
    "",
    response_model=LocationSchema
)
async def create_location(
    location_in: LocationNodeCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:locations:manage"))]
):
    # Verificar si el código ya existe
    res = await db.execute(select(LocationModel).where(LocationModel.dependency_code == location_in.dependency_code))
    if res.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="El código de dependencia ya está en uso")
        
    return await crud_location.create(db, obj_in=location_in)

@router.put("/{location_id}", response_model=LocationSchema)
async def update_location(
    location_id: UUID,
    location_in: LocationNodeUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:locations:manage"))]
):
    loc = await crud_location.get(db, id=location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Dependencia no encontrada")
    return await crud_location.update(db, db_obj=loc, obj_in=location_in)

@router.delete("/{location_id}")
async def delete_location(
    location_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:locations:manage"))]
):
    loc = await crud_location.get(db, id=location_id)
    if not loc:
        raise HTTPException(status_code=404, detail="Dependencia no encontrada")
    
    try:
        await crud_location.delete(db, id=location_id)
    except Exception as e:
        if "foreign key constraint" in str(e).lower() or "violates foreign key" in str(e).lower():
            raise HTTPException(
                status_code=400, 
                detail="No se puede eliminar la dependencia porque tiene activos o elementos asociados."
            )
        raise e
        
    return {"status": "ok"}
