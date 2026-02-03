import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid

from app.db.session import AsyncSessionLocal
from app.crud.crud_user import user
from app.schemas.user import UserCreate
from app.db.models import Group, User, SLAPolicy, WorkflowTransition, Workflow, WorkflowState
from app.db.models.iam import Role, Permission, UserRole, RolePermission
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_db() -> None:
    async with AsyncSessionLocal() as session:
        # 1. Create Default Group
        result = await session.execute(select(Group).filter(Group.name == "Admin"))
        group = result.scalar_one_or_none()
        if not group:
            group = Group(id=uuid.uuid4(), name="Admin", description="Administrators Group")
            session.add(group)
            await session.commit()
            await session.refresh(group)
            logger.info("Created Admin group")

        # 2. Create Permissions
        permissions_to_create = [
            {"name": "iam:manage:roles", "description": "Manage roles and their permissions"},
            {"name": "iam:manage:users", "description": "Manage users"},
            {"name": "ticket:create", "description": "Create new tickets"},
            {"name": "ticket:read:all", "description": "Read all tickets"},
            {"name": "ticket:read:assigned", "description": "Read tickets assigned to self"},
            {"name": "ticket:read:group", "description": "Read tickets in the same group"},
            {"name": "ticket:update:all", "description": "Update all tickets"},
            {"name": "ticket:update:assigned", "description": "Update tickets assigned to self"},
            {"name": "ticket:delete:all", "description": "Delete all tickets"},
            {"name": "ticket:delete:assigned", "description": "Delete tickets assigned to self"},
            {"name": "dashboard:view", "description": "View dashboard"},
            {"name": "admin:view", "description": "View admin panel"},
            {"name": "report:view", "description": "View reports"},
            {"name": "dashboard:view:stats", "description": "View dashboard statistics"},
        ]
        
        permission_map = {}
        for p_data in permissions_to_create:
            result = await session.execute(select(Permission).filter(Permission.key == p_data["name"]))
            permission = result.scalar_one_or_none()
            if not permission:
                permission = Permission(
                    key=p_data["name"],
                    name=p_data["name"].replace(':', ' ').title(),
                    description=p_data["description"],
                    module="initial"
                )
                session.add(permission)
                await session.flush()
                logger.info(f"Created permission: {p_data['name']}")
            permission_map[p_data["name"]] = permission
        
        await session.commit()

        # 3. Create Administrator Role and Assign Permissions
        result = await session.execute(select(Role).filter(Role.name == "Administrator"))
        admin_role = result.scalar_one_or_none()
        if not admin_role:
            admin_role = Role(name="Administrator", description="Administrator role with all permissions")
            session.add(admin_role)
            await session.flush()
            
            for permission in permission_map.values():
                role_permission = RolePermission(role_id=admin_role.id, permission_id=permission.id)
                session.add(role_permission)

            logger.info("Created Administrator role and assigned all permissions")
        
        await session.commit()

        # 4. Create Superuser
        superuser_user = await user.get_by_email(session, email=settings.FIRST_SUPERUSER)
        if not superuser_user:
            user_in = UserCreate(
                email=settings.FIRST_SUPERUSER,
                username="admin",
                password=settings.FIRST_SUPERUSER_PASSWORD,
                is_superuser=True,
                group_id=group.id,
                first_name="Admin",
                last_name="System",
                role_ids=[admin_role.id]
            )
            superuser_user = await user.create(session, obj_in=user_in)
            logger.info(f"Superuser created: {settings.FIRST_SUPERUSER}")
        else:
            # Ensure superuser has admin role
            result = await session.execute(select(UserRole).filter(UserRole.user_id == superuser_user.id, UserRole.role_id == admin_role.id))
            user_role = result.scalar_one_or_none()
            if not user_role:
                user_role = UserRole(user_id=superuser_user.id, role_id=admin_role.id)
                session.add(user_role)
                await session.commit()
                logger.info("Assigned Administrator role to superuser")
            logger.info("Superuser already exists")


        # 6. Ensure Workflow and Workflow States
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
            {"name": "Resuelto", "status_key": "resolved", "color": "success"},
            {"name": "Cerrado", "status_key": "closed", "color": "dark", "is_final": True},
        ]

        state_map = {} 
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

        # 7. Ensure Workflow Transitions
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
                    name=f"{from_state.name} to {to_state.name}"
                ))
                logger.info(f"Transition {f_key} -> {t_key} created")
        
        await session.commit()

if __name__ == "__main__":
    asyncio.run(init_db())
