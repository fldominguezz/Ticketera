from typing import Annotated, List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from uuid import UUID

from app.api.deps import get_db, require_permission, get_current_active_user
from app.db.models import Group, User
from app.schemas.group import Group as GroupSchema, GroupCreate, GroupUpdate

router = APIRouter()

def build_tree(items: List[Any], parent_id: Optional[UUID] = None) -> List[Dict[str, Any]]:
    """
    Utilidad recursiva para construir el árbol.
    """
    tree = []
    for item in items:
        if item.parent_id == parent_id:
            children = build_tree(items, item.id)
            node = {
                "id": item.id,
                "name": item.name,
                "description": item.description,
                "parent_id": item.parent_id,
                "children": children,
                "is_active": item.is_active if hasattr(item, 'is_active') else True
            }
            if hasattr(item, 'dependency_code'):
                node["dependency_code"] = item.dependency_code
            tree.append(node)
    return tree

@router.get(
    "/tree"
)
async def read_groups_tree(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:groups:read"))],
):
    """
    Retorna la estructura jerárquica completa de grupos.
    """
    query = select(Group).filter(Group.deleted_at == None)
    result = await db.execute(query)
    all_groups = result.scalars().all()
    return build_tree(all_groups)

@router.get(
    "",
    response_model=List[GroupSchema]
)
async def read_groups(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    skip: int = 0,
    limit: int = 100,
):
    # Permission Check: Admin OR Ticket Creator
    if not current_user.is_superuser and \
       not current_user.has_permission("admin:groups:read") and \
       not current_user.has_permission("ticket:create"):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    query = (
        select(Group)
        .options(selectinload(Group.parent_group))
        .filter(Group.deleted_at == None)
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.post(
    "",
    response_model=GroupSchema,
    status_code=status.HTTP_201_CREATED
)
async def create_group(
    group_in: GroupCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:groups:manage"))],
):
    db_group = Group(**group_in.model_dump())
    db.add(db_group)
    await db.commit()
    await db.refresh(db_group)
    return db_group

@router.put(
    "/{group_id}",
    response_model=GroupSchema
)
async def update_group(
    group_id: UUID,
    group_in: GroupUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:groups:manage"))],
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
    await db.refresh(group)
    return group

@router.delete(
    "/{group_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_group(
    group_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_permission("admin:groups:manage"))],
):
    query = select(Group).filter(Group.id == group_id)
    result = await db.execute(query)
    group = result.scalar_one_or_none()
    
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Soft delete
    from datetime import datetime
    group.deleted_at = datetime.utcnow()
    db.add(group)
    await db.commit()
    return None