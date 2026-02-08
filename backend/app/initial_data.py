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
from app.core.permissions import PermissionEnum, ALL_PERMISSIONS

from app.db.models.ticket import Ticket as TicketModel, TicketType

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

        # 2. Create Permissions from Registry
        permission_map = {}
        for perm_key in ALL_PERMISSIONS:
            result = await session.execute(select(Permission).filter(Permission.key == perm_key))
            permission = result.scalar_one_or_none()
            
            if not permission:
                # Determinar módulo por prefijo
                module = perm_key.split(":")[0]
                permission = Permission(
                    id=uuid.uuid4(),
                    key=perm_key,
                    name=perm_key.replace(':', ' ').title(),
                    description=f"Permission for {perm_key}",
                    module=module
                )
                session.add(permission)
                await session.flush()
                logger.info(f"Registered permission: {perm_key}")
            permission_map[perm_key] = permission
        
        await session.commit()

        # 3. Create Roles
        roles_to_create = [
            {
                "name": "AdminPanelFull",
                "description": "Acceso total al sistema",
                "permissions": ALL_PERMISSIONS
            },
            {
                "name": "DSIN_Operativo_AdminParcial",
                "description": "Operativo DSIN con gestión de activos y ubicaciones",
                "permissions": [
                    PermissionEnum.TICKET_READ_GLOBAL, PermissionEnum.TICKET_CREATE,
                    PermissionEnum.TICKET_COMMENT_GLOBAL, PermissionEnum.TICKET_WATCH_GLOBAL,
                    PermissionEnum.ADMIN_LOCATIONS_READ, PermissionEnum.ADMIN_LOCATIONS_MANAGE,
                    PermissionEnum.ASSETS_READ_GLOBAL, PermissionEnum.ASSETS_MANAGE_GLOBAL,
                    PermissionEnum.DASHBOARD_VIEW, PermissionEnum.REPORT_VIEW,
                    PermissionEnum.FORENSICS_EML_SCAN
                ]
            },
            {
                "name": "Area_Operativa",
                "description": "Personal técnico de áreas operativas",
                "permissions": [
                    PermissionEnum.TICKET_READ_GROUP, PermissionEnum.TICKET_CREATE,
                    PermissionEnum.TICKET_UPDATE_ASSIGNED, PermissionEnum.TICKET_COMMENT_GROUP,
                    PermissionEnum.ASSETS_READ_GROUP, PermissionEnum.DASHBOARD_VIEW,
                    PermissionEnum.FORENSICS_EML_SCAN
                ]
            },
            {
                "name": "UsuarioFinal",
                "description": "Usuario final de la plataforma",
                "permissions": [
                    PermissionEnum.TICKET_READ_OWN, PermissionEnum.TICKET_CREATE,
                    PermissionEnum.TICKET_COMMENT_OWN, PermissionEnum.FORENSICS_EML_SCAN
                ]
            }
        ]

        role_objs = {}
        for r_data in roles_to_create:
            result = await session.execute(select(Role).filter(Role.name == r_data["name"]))
            role = result.scalar_one_or_none()
            if not role:
                role = Role(id=uuid.uuid4(), name=r_data["name"], description=r_data["description"])
                session.add(role)
                await session.flush()
                
                # Assign Permissions
                for p_key in r_data["permissions"]:
                    p_obj = permission_map.get(p_key)
                    if p_obj:
                        session.add(RolePermission(role_id=role.id, permission_id=p_obj.id))
                
                logger.info(f"Created role: {r_data['name']}")
            role_objs[r_data["name"]] = role
        
        await session.commit()

        # 4. Create Superuser with AdminPanelFull
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
                role_ids=[role_objs["AdminPanelFull"].id]
            )
            superuser_user = await user.create(session, obj_in=user_in)
            logger.info(f"Superuser created: {settings.FIRST_SUPERUSER}")
        else:
            # Asegurar que tenga el rol AdminPanelFull si ya existe
            result = await session.execute(select(UserRole).filter(
                UserRole.user_id == superuser_user.id,
                UserRole.role_id == role_objs["AdminPanelFull"].id
            ))
            if not result.scalar_one_or_none():
                session.add(UserRole(user_id=superuser_user.id, role_id=role_objs["AdminPanelFull"].id))
                await session.commit()
                logger.info("Assigned AdminPanelFull role to existing superuser")

        # 5. Ensure Workflow and Workflow States
        result = await session.execute(select(Workflow).filter(Workflow.name == "Default Ticket Workflow"))
        default_workflow = result.scalar_one_or_none()
        if not default_workflow:
            default_workflow = Workflow(id=uuid.uuid4(), name="Default Ticket Workflow", description="Workflow estándar para tickets.")
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
                state = WorkflowState(id=uuid.uuid4(), workflow_id=default_workflow.id, **sd)
                session.add(state)
                await session.flush()
                logger.info(f"Workflow State {sd['name']} created")
            state_map[sd["status_key"]] = state

        # 6. Ensure Workflow Transitions
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
                    id=uuid.uuid4(),
                    workflow_id=default_workflow.id,
                    from_state_id=from_state.id,
                    to_state_id=to_state.id,
                    name=f"{from_state.name} to {to_state.name}"
                ))
                logger.info(f"Transition {f_key} -> {t_key} created")

        # 7. Create Default Ticket Types
        ticket_types_data = [
            {"name": "Soporte", "description": "Tareas de soporte general", "icon": "help-circle", "color": "primary"},
            {"name": "Incidente", "description": "Fallo en servicio o activo", "icon": "alert-triangle", "color": "danger"},
            {"name": "ALERTA SIEM", "description": "Alerta automática de seguridad", "icon": "shield", "color": "warning"},
        ]

        for tt_data in ticket_types_data:
            result = await session.execute(select(TicketType).filter(TicketType.name == tt_data["name"]))
            if not result.scalar_one_or_none():
                session.add(TicketType(id=uuid.uuid4(), workflow_id=default_workflow.id, **tt_data))
                logger.info(f"Created TicketType: {tt_data['name']}")
        
        await session.commit()


if __name__ == "__main__":
    asyncio.run(init_db())