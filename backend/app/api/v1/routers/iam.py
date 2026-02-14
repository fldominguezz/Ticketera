from typing import List, Annotated
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, require_permission, require_role
from app.schemas.iam import Role, RoleCreate, RoleUpdate, Permission, PermissionCreate, PermissionUpdate
from app.db.models.iam import Role as RoleModel, Permission as PermissionModel, RolePermission
from app.db.models.user import User
from app.schemas.user import User as UserSchema, UserCreate, UserUpdate
from app.crud import crud_user, crud_iam

router = APIRouter()

# --- Admin Users Aliases (to satisfy frontend /api/v1/admin/users) ---

@router.get(
    "/admin/users",
    response_model=List[UserSchema],
    include_in_schema=False
)
async def read_users_admin_alias(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:users:read"))],
    skip: int = 0,
    limit: int = 100,
):
    from .users import read_users
    return await read_users(db, current_user, skip, limit)

@router.post(
    "/admin/users",
    response_model=UserSchema,
    status_code=201,
    include_in_schema=False
)
async def create_user_admin_alias(
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:users:manage"))],
):
    from .users import create_user
    return await create_user(user_in, db, current_user)

@router.get(
    "/admin/users/{user_id}",
    response_model=UserSchema,
    include_in_schema=False
)
async def read_user_admin_alias(
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:users:read"))],
):
    from .users import read_user_admin
    return await read_user_admin(user_id, db, current_user)

@router.put(
    "/admin/users/{user_id}",
    response_model=UserSchema,
    include_in_schema=False
)
async def update_user_admin_alias(
    request: Request,
    user_id: UUID,
    user_in: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:users:manage"))],
):
    from .users import update_user_admin
    return await update_user_admin(request, user_id, user_in, db, current_user)

@router.delete(
    "/admin/users/{user_id}",
    include_in_schema=False
)
async def delete_user_admin_alias(
    request: Request,
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:users:manage"))],
):
    from .users import delete_user_admin
    return await delete_user_admin(request, user_id, db, current_user)

# --- Standard Roles/Permissions ---

@router.get(
    "/permissions",
    response_model=List[Permission]
)
async def read_permissions(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:roles:read"))]
):
    return await crud_iam.iam.get_all_permissions(db)

@router.post(
    "/permissions",
    response_model=Permission
)
async def create_permission(
    permission_in: PermissionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:roles:manage"))]
):
    exists = await crud_iam.iam.get_permission_by_key(db, key=permission_in.key)
    if exists:
        raise HTTPException(status_code=400, detail="Permission key already exists")
    return await crud_iam.iam.create_permission(db, obj_in=permission_in)

@router.put(
    "/permissions/{permission_id}",
    response_model=Permission
)
async def update_permission(
    permission_id: UUID,
    permission_in: PermissionUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:roles:manage"))]
):
    permission = await crud_iam.iam.get_permission(db, permission_id=permission_id)
    if not permission:
        raise HTTPException(status_code=404, detail="Permission not found")
    return await crud_iam.iam.update_permission(db, permission=permission, obj_in=permission_in)

@router.delete(
    "/permissions/{permission_id}"
)
async def delete_permission(
    permission_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:roles:manage"))]
):
    await crud_iam.iam.delete_permission(db, permission_id=permission_id)
    return {"status": "ok"}

@router.get(
    "/roles",
    response_model=List[Role]
)
async def read_roles(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:roles:read"))]
):
    result = await db.execute(
        select(RoleModel).options(selectinload(RoleModel.permissions).selectinload(RolePermission.permission))
    )
    roles = result.scalars().all()
    
    output = []
    for r in roles:
        perms = [rp.permission for rp in r.permissions if rp.permission]
        output.append(Role(
            id=r.id,
            name=r.name,
            description=r.description,
            hidden_nav_items=r.hidden_nav_items,
            permissions=[Permission.model_validate(p) for p in perms]
        ))
    return output

@router.post(
    "/roles",
    response_model=Role
)
async def create_role(
    role_in: RoleCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:roles:manage"))]
):
    db_obj = RoleModel(
        name=role_in.name, 
        description=role_in.description,
        hidden_nav_items=role_in.hidden_nav_items
    )
    db.add(db_obj)
    await db.flush()
    
    for p_id in role_in.permission_ids:
        rp = RolePermission(role_id=db_obj.id, permission_id=p_id)
        db.add(rp)
    
    await db.commit()
    await db.refresh(db_obj)
    
    res = await db.execute(
        select(RoleModel).where(RoleModel.id == db_obj.id)
        .options(selectinload(RoleModel.permissions).selectinload(RolePermission.permission))
    )
    return Role.model_validate(res.scalar_one())

@router.put(
    "/roles/{role_id}",
    response_model=Role
)
async def update_role(
    role_id: UUID,
    role_in: RoleUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:roles:manage"))]
):
    result = await db.execute(select(RoleModel).where(RoleModel.id == role_id))
    db_obj = result.scalar_one_or_none()
    if not db_obj:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if role_in.name: db_obj.name = role_in.name
    if role_in.description: db_obj.description = role_in.description
    if role_in.hidden_nav_items is not None: db_obj.hidden_nav_items = role_in.hidden_nav_items
    
    if role_in.permission_ids is not None:
        await db.execute(RolePermission.__table__.delete().where(RolePermission.role_id == role_id))
        for p_id in role_in.permission_ids:
            rp = RolePermission(role_id=role_id, permission_id=p_id)
            db.add(rp)
            
    await db.commit()
    
    res = await db.execute(
        select(RoleModel).where(RoleModel.id == role_id)
        .options(selectinload(RoleModel.permissions).selectinload(RolePermission.permission))
    )
    return Role.model_validate(res.scalar_one())

@router.delete(
    "/roles/{role_id}"
)
async def delete_role(
    role_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:roles:manage"))]
):
    result = await db.execute(select(RoleModel).where(RoleModel.id == role_id))
    db_obj = result.scalar_one_or_none()
    if db_obj:
        await db.delete(db_obj)
        await db.commit()
    return {"status": "ok"}