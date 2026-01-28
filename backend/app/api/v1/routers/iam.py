from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_current_active_user
from app.schemas.iam import Role, RoleCreate, RoleUpdate, Permission
from app.db.models.iam import Role as RoleModel, Permission as PermissionModel, RolePermission
from app.db.models.user import User

router = APIRouter()

@router.get("/permissions", response_model=List[Permission])
async def read_permissions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(select(PermissionModel))
    return result.scalars().all()

@router.get("/roles", response_model=List[Role])
async def read_roles(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    result = await db.execute(
        select(RoleModel).options(selectinload(RoleModel.permissions).selectinload(RolePermission.permission))
    )
    roles = result.scalars().all()
    
    # Manual conversion to ensure strict compatibility with Schema
    output = []
    for r in roles:
        # Extract actual permission models from the association objects
        perms = [rp.permission for rp in r.permissions if rp.permission]
        output.append(Role(
            id=r.id,
            name=r.name,
            description=r.description,
            permissions=[Permission.model_validate(p) for p in perms]
        ))
    return output

@router.post("/roles", response_model=Role)
async def create_role(
    *,
    db: AsyncSession = Depends(get_db),
    role_in: RoleCreate,
    current_user: User = Depends(get_current_active_user)
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    # Create role
    db_obj = RoleModel(name=role_in.name, description=role_in.description)
    db.add(db_obj)
    await db.flush()
    
    # Add permissions
    for p_id in role_in.permission_ids:
        rp = RolePermission(role_id=db_obj.id, permission_id=p_id)
        db.add(rp)
    
    await db.commit()
    await db.refresh(db_obj)
    
    # Re-fetch with joined data
    res = await db.execute(
        select(RoleModel).where(RoleModel.id == db_obj.id)
        .options(selectinload(RoleModel.permissions).selectinload(RolePermission.permission))
    )
    return Role.from_orm(res.scalar_one())

@router.put("/roles/{role_id}", response_model=Role)
async def update_role(
    *,
    db: AsyncSession = Depends(get_db),
    role_id: UUID,
    role_in: RoleUpdate,
    current_user: User = Depends(get_current_active_user)
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = await db.execute(select(RoleModel).where(RoleModel.id == role_id))
    db_obj = result.scalar_one_or_none()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role_in.name: db_obj.name = role_in.name
    if role_in.description: db_obj.description = role_in.description
    
    if role_in.permission_ids is not None:
        # Simple approach: clear and re-add
        await db.execute(RolePermission.__table__.delete().where(RolePermission.role_id == role_id))
        for p_id in role_in.permission_ids:
            rp = RolePermission(role_id=role_id, permission_id=p_id)
            db.add(rp)
            
    await db.commit()
    
    # Re-fetch
    res = await db.execute(
        select(RoleModel).where(RoleModel.id == role_id)
        .options(selectinload(RoleModel.permissions).selectinload(RolePermission.permission))
    )
    return Role.from_orm(res.scalar_one())

@router.delete("/roles/{role_id}")
async def delete_role(
    role_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    
    result = await db.execute(select(RoleModel).where(RoleModel.id == role_id))
    db_obj = result.scalar_one_or_none()
    if db_obj:
        await db.delete(db_obj)
        await db.commit()
    return {"status": "ok"}
