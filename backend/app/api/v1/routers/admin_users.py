from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from uuid import UUID

from app.schemas.user import User as UserSchema, UserCreate, UserUpdate
from app.crud.crud_user import user as crud_user
from app.api.deps import get_db, get_current_superuser
from app.db.models import User
from app.crud import crud_audit
from fastapi import Request

router = APIRouter()

from app.db.models.group import Group

@router.get("", response_model=List[UserSchema])
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_superuser)],
    skip: int = 0,
    limit: int = 100,
):
    """
    List all users. (Superuser only)
    """
    query = (
        select(User, Group.name.label("group_name"))
        .outerjoin(Group, User.group_id == Group.id)
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    
    users_data = []
    for user_obj, group_name in result.all():
        u_dict = UserSchema.model_validate(user_obj).model_dump()
        u_dict["group_name"] = group_name
        users_data.append(UserSchema(**u_dict))
        
    return users_data

@router.post("", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def create_user_admin(
    request: Request,
    user_in: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_superuser)],
):
    """
    Create a new user from admin panel.
    """
    db_user = await crud_user.get_by_email(db, email=user_in.email)
    if db_user:
        raise HTTPException(status_code=400, detail="The user with this email already exists.")
    
    db_user = await crud_user.get_by_username(db, username=user_in.username)
    if db_user:
        raise HTTPException(status_code=400, detail="The user with this username already exists.")

    new_user = await crud_user.create(db, obj_in=user_in)
    
    # Load group for response
    result = await db.execute(
        select(User).where(User.id == new_user.id).options(selectinload(User.group))
    )
    new_user = result.scalar_one()

    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="admin_user_created",
        ip_address=request.client.host,
        details={"created_user_id": str(new_user.id), "username": new_user.username}
    )
    return new_user

@router.put("/{user_id}", response_model=UserSchema)
async def update_user_admin(
    request: Request,
    user_id: UUID,
    user_in: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_superuser)],
):
    """
    Update a user from admin panel.
    """
    db_user = await crud_user.get(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_user = await crud_user.update(db, db_obj=db_user, obj_in=user_in)
    
    # Load group for response
    result = await db.execute(
        select(User).where(User.id == updated_user.id).options(selectinload(User.group))
    )
    updated_user = result.scalar_one()

    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="admin_user_updated",
        ip_address=request.client.host,
        details={"updated_user_id": str(user_id)}
    )
    return updated_user

@router.delete("/{user_id}")
async def delete_user_admin(
    request: Request,
    user_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_superuser)],
):
    """
    Delete (deactivate) a user.
    """
    db_user = await crud_user.get(db, user_id=user_id)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    db_user.is_active = False
    db.add(db_user)
    await db.commit()
    
    await crud_audit.audit_log.create_log(
        db,
        user_id=current_user.id,
        event_type="admin_user_deactivated",
        ip_address=request.client.host,
        details={"deactivated_user_id": str(user_id)}
    )
    return {"status": "success", "detail": "User deactivated"}
