from typing import List, Optional, Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import Integer

from app.api.deps import get_db, require_permission, get_current_active_user
from app.schemas.location import LocationNode as LocationSchema, LocationNodeCreate, LocationNodeUpdate, LocationPagination
from app.crud.crud_location import location as crud_location
from app.db.models.user import User
from app.db.models.location import LocationNode as LocationModel

router = APIRouter()

@router.get(
    "",
    response_model=LocationPagination
)
async def read_locations(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    q: Optional[str] = Query(None, description="Buscar por nombre o código de dependencia"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100)
):
    """
    Retorna la lista de dependencias con conteo de activos y paginación.
    """
    skip = (page - 1) * size
    
    if q:
        # Lógica con filtro y conteo de activos
        from sqlalchemy import func
        from app.db.models.asset import Asset
        
        # Total con filtro
        total_query = select(func.count(LocationModel.id)).filter(
            (LocationModel.name.ilike(f"%{q}%")) | 
            (LocationModel.dependency_code.ilike(f"%{q}%"))
        )
        total_res = await db.execute(total_query)
        total = total_res.scalar() or 0

        asset_count_subquery = (
            select(Asset.location_node_id, func.count(Asset.id).label("total_assets"))
            .group_by(Asset.location_node_id)
            .subquery()
        )

        query = (
            select(
                LocationModel,
                func.coalesce(asset_count_subquery.c.total_assets, 0).label("total_assets")
            )
            .outerjoin(asset_count_subquery, LocationModel.id == asset_count_subquery.c.location_node_id)
            .filter(
                (LocationModel.name.ilike(f"%{q}%")) | 
                (LocationModel.dependency_code.ilike(f"%{q}%"))
            )
            .order_by(func.nullif(func.regexp_replace(LocationModel.dependency_code, '[^0-9]', '', 'g'), '').cast(Integer).asc(), LocationModel.dependency_code.asc())
            .offset(skip)
            .limit(size)
        )
        
        result = await db.execute(query)
        items = []
        for row in result.all():
            loc_obj = row[0]
            loc_obj.total_assets = row[1]
            loc_obj.direct_assets = row[1]
            items.append(loc_obj)
            
        return {
            "items": items,
            "total": total,
            "page": page,
            "size": size,
            "pages": (total + size - 1) // size
        }

    # Sin búsqueda, usamos get_all paginado
    data = await crud_location.get_all(db, skip=skip, limit=size)
    total = data["total"]
    
    return {
        "items": data["items"],
        "total": total,
        "page": page,
        "size": size,
        "pages": (total + size - 1) // size
    }

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
