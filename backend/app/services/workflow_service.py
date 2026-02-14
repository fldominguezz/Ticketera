from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from uuid import UUID
from app.db.models.workflow import WorkflowTransition, WorkflowState
class WorkflowService:
    async def get_allowed_transitions(self, db: AsyncSession, from_status: str) -> List[str]:
        """Devuelve una lista de estados a los que se puede pasar desde el estado actual."""
        # Buscar el ID del estado actual basado en el status_key
        from_state_res = await db.execute(select(WorkflowState.id).filter(WorkflowState.status_key == from_status))
        from_state_id = from_state_res.scalar_one_or_none()
        if not from_state_id:
            return []
        # Buscar transiciones permitidas
        query = (
            select(WorkflowState.status_key)
            .join(WorkflowTransition, WorkflowTransition.to_state_id == WorkflowState.id)
            .filter(WorkflowTransition.from_state_id == from_state_id)
        )
        result = await db.execute(query)
        return result.scalars().all()
    async def is_transition_allowed(self, db: AsyncSession, from_status: str, to_status: str) -> bool:
        if from_status == to_status:
            return True
        # Lógica de fallback: si la tabla de transiciones está vacía, permitimos todo
        all_rules_res = await db.execute(select(WorkflowTransition).limit(1))
        if not all_rules_res.scalar():
            return True
        # Buscar estados por status_key
        from_state_res = await db.execute(select(WorkflowState.id).filter(WorkflowState.status_key == from_status))
        to_state_res = await db.execute(select(WorkflowState.id).filter(WorkflowState.status_key == to_status))
        from_id = from_state_res.scalar_one_or_none()
        to_id = to_state_res.scalar_one_or_none()
        if not from_id or not to_id:
            return False # Si los estados no están en la config de workflow, no permitimos el paso si hay reglas
        result = await db.execute(
            select(WorkflowTransition).filter(
                WorkflowTransition.from_state_id == from_id,
                WorkflowTransition.to_state_id == to_id
            )
        )
        transition = result.scalar_one_or_none()
        return transition is not None
workflow_service = WorkflowService()
