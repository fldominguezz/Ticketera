from typing import Annotated, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from uuid import UUID

from app.api.deps import get_db, get_current_active_user, get_current_superuser
from app.db.models import Group, User
from app.schemas.group import Group as GroupSchema, GroupCreate, GroupUpdate # Create these schemas

router = APIRouter()

@router.get("", response_model=List[GroupSchema])
async def read_groups(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    skip: int = 0,
    limit: int = 100,
):
    """
    List all groups with their parent group loaded.
    """
    query = (
        select(Group)
        .options(selectinload(Group.parent_group))
        .filter(Group.deleted_at == None)
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    groups_objs = result.scalars().all()
    
    # El mapeo manual ya no es necesario si el esquema maneja group_name
    # Pero para no romper el esquema actual que usa parent_name:
    for g in groups_objs:
        if g.parent_group:
            setattr(g, "parent_name", g.parent_group.name)
        else:
            setattr(g, "parent_name", None)
            
    return groups_objs

@router.post("", response_model=GroupSchema, status_code=status.HTTP_201_CREATED)
async def create_group(
    group_in: GroupCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_superuser)], # Only superuser/admin can manage groups structure usually
):
    """
    Create a new group.
    """
    db_group = Group(**group_in.model_dump())
    db.add(db_group)
    await db.commit()
    
    # Load parent for response
    result = await db.execute(
        select(Group).where(Group.id == db_group.id).options(selectinload(Group.parent_group))
    )
    db_group = result.scalar_one()
    return db_group

@router.put("/{group_id}", response_model=GroupSchema)
async def update_group(
    group_id: UUID,
    group_in: GroupUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_superuser)],
):
    query = select(Group).filter(Group.id == group_id)
    result = await db.execute(query)
    group = result.scalar_one_or_none()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    for var, value in group_in.model_dump(exclude_unset=True).items():
        setattr(group, var, value)

    db.add(group)
    await db.commit()
    
    # Load parent for response
    result = await db.execute(
        select(Group).where(Group.id == group.id).options(selectinload(Group.parent_group))
    )
    group = result.scalar_one()
    return group
