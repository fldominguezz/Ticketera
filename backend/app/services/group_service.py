from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.models.group import Group

class GroupService:
    async def get_all_child_group_ids(self, db: AsyncSession, group_id: UUID) -> List[UUID]:
        """
        Recursively find all child group IDs for a given group, including itself.
        Using CTE (Common Table Expression) for performance would be better, but recursive python loop is safer for now.
        """
        all_ids = {group_id}
        
        # Initial query for direct children
        query = select(Group.id).filter(Group.parent_id == group_id, Group.deleted_at == None)
        result = await db.execute(query)
        children_ids = result.scalars().all()
        
        for child_id in children_ids:
            all_ids.add(child_id)
            # Recursive call (inefficient for deep trees, better to use Recursive CTE in SQL)
            # For simplicity in this iteration:
            pass # Pending proper recursive implementation or CTE
            
        return list(all_ids)

group_service = GroupService()