from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models.group import Group
from uuid import UUID
from typing import List

class GroupService:
    async def get_all_child_group_ids(self, db: AsyncSession, group_id: UUID) -> List[UUID]:
        """
        Retorna una lista de IDs que incluye al grupo actual y a todos sus descendientes.
        """
        if not group_id:
            return []
            
        result = await db.execute(select(Group))
        all_groups = result.scalars().all()
        
        descendants = [group_id]
        
        def find_children(parent_id):
            for g in all_groups:
                if g.parent_id == parent_id:
                    if g.id not in descendants:
                        descendants.append(g.id)
                        find_children(g.id)
        
        find_children(group_id)
        return descendants

group_service = GroupService()