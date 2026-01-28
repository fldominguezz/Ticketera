import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid

from app.db.session import AsyncSessionLocal
from app.crud.crud_user import user
from app.schemas.user import UserCreate
from app.db.models import Group, TicketType, User, SLAPolicy, WorkflowTransition, Workflow, WorkflowState

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_db() -> None:
    async with AsyncSessionLocal() as session:
        # ... (existing code for Group, User, TicketType, SLAPolicy) ...

        # 6. Ensure Workflow and Workflow States
        # Create a default workflow if it doesn't exist
        result = await session.execute(select(Workflow).filter(Workflow.name == "Default Ticket Workflow"))
        default_workflow = result.scalar_one_or_none()
        if not default_workflow:
            default_workflow = Workflow(name="Default Ticket Workflow", description="Workflow estándar para tickets.")
            session.add(default_workflow)
            await session.flush()
            logger.info("Default Workflow created")

        # Define default states
        states_data = [
            {"name": "Abierto", "status_key": "open", "color": "primary", "is_initial": True},
            {"name": "En Progreso", "status_key": "in_progress", "color": "info"},
            {"name": "Pendiente", "status_key": "pending", "color": "warning"},
            {"name": "Resuelto", "status_key": "success", "color": "success"},
            {"name": "Cerrado", "status_key": "secondary", "color": "dark", "is_final": True},
        ]

        state_map = {} # To map status_key to WorkflowState object
        for sd in states_data:
            result = await session.execute(select(WorkflowState).filter(
                WorkflowState.workflow_id == default_workflow.id,
                WorkflowState.status_key == sd["status_key"]
            ))
            state = result.scalar_one_or_none()
            if not state:
                state = WorkflowState(workflow_id=default_workflow.id, **sd)
                session.add(state)
                await session.flush()
                logger.info(f"Workflow State {sd['name']} created")
            state_map[sd["status_key"]] = state

        # 7. Ensure Workflow Transitions (using state_map)
        transitions = [
            ("open", "in_progress"),
            ("in_progress", "pending"),
            ("pending", "in_progress"),
            ("in_progress", "resolved"),
            ("resolved", "closed"),
            ("open", "closed"),
            ("resolved", "in_progress"),
            ("closed", "open"),
        ]
        for f_key, t_key in transitions:
            from_state = state_map.get(f_key)
            to_state = state_map.get(t_key)

            if not from_state or not to_state:
                logger.warning(f"Skipping transition {f_key} -> {t_key}: one or both states not found.")
                continue

            result = await session.execute(
                select(WorkflowTransition).filter(
                    WorkflowTransition.workflow_id == default_workflow.id,
                    WorkflowTransition.from_state_id == from_state.id,
                    WorkflowTransition.to_state_id == to_state.id
                )
            )
            if not result.scalar_one_or_none():
                session.add(WorkflowTransition(
                    workflow_id=default_workflow.id,
                    from_state_id=from_state.id,
                    to_state_id=to_state.id,
                    name=f"{from_state.name} to {to_state.name}" # Provide a default name
                ))
                logger.info(f"Transition {f_key} -> {t_key} created")