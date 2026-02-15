import asyncio
import logging
import csv
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
import uuid
from app.db.session import AsyncSessionLocal
from app.crud.crud_user import user
from app.schemas.user import UserCreate
from app.db.models import Group, User, SLAPolicy, WorkflowTransition, Workflow, WorkflowState, LocationNode, SIEMConfiguration
from app.db.models.iam import Role, Permission, UserRole, RolePermission
from app.core.config import settings
from app.core.permissions import PermissionEnum, ALL_PERMISSIONS
from app.db.models.ticket import Ticket as TicketModel, TicketType
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
async def init_siem_config(session: AsyncSession, siem_user: User, group_objs: dict, default_workflow_id: uuid.UUID) -> None:
    """Asegura la configuración de integración del SIEM."""
    # Buscar el tipo de ticket ALERTA SIEM
    res_tt = await session.execute(select(TicketType).filter(TicketType.name == "ALERTA SIEM"))
    ttype = res_tt.scalar_one_or_none()
    if not ttype:
        ttype = TicketType(id=uuid.uuid4(), name="ALERTA SIEM", description="Alerta automática", icon="shield", color="warning", workflow_id=default_workflow_id)
        session.add(ttype)
        await session.flush()
    res_config = await session.execute(select(SIEMConfiguration).limit(1))
    config = res_config.scalar_one_or_none()
    siem_api_password = os.getenv("SIEM_API_PASSWORD", "!zmXwu*gEg0@") # Fallback to legacy if not set
    if not config:
        config = SIEMConfiguration(
            id=uuid.uuid4(),
            siem_user_id=siem_user.id,
            default_group_id=group_objs["Area SOC"].id,
            ticket_type_id=ttype.id,
            api_username=siem_user.email,
            api_password=siem_api_password,
            allowed_ips="10.1.78.10",
            is_active=True
        )
        session.add(config)
        logger.info("SIEM integration configuration created")
    else:
        # Asegurar valores correctos
        config.siem_user_id = siem_user.id
        config.default_group_id = group_objs["Area SOC"].id
        config.ticket_type_id = ttype.id
        config.api_username = siem_user.email
        config.api_password = siem_api_password
        config.allowed_ips = "10.1.78.10"
        session.add(config)
        logger.info("SIEM integration configuration updated/verified")
    await session.commit()
async def init_locations(session: AsyncSession) -> None:
    """Importa las 769 dependencias desde el CSV."""
    csv_path = "/app/dependencias.csv"
    if not os.path.exists(csv_path):
        logger.warning(f"CSV de dependencias no encontrado en {csv_path}")
        return
    # Mapeo de ID del CSV -> UUID de la DB
    id_to_uuid = {}
    rows = []
    with open(csv_path, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    # 1. Superintendencias (Raíces)
    for row in rows:
        csv_id, super_id = row['id'], row['superintendencia']
        if csv_id == super_id:
            name, code = row['nombre_dependencia'].strip(), row['codigo'].strip()
            res = await session.execute(select(LocationNode).filter(LocationNode.dependency_code == code))
            if not res.scalar_one_or_none():
                uid = uuid.uuid4()
                loc = LocationNode(id=uid, name=name, dependency_code=code, path=name)
                session.add(loc)
                id_to_uuid[csv_id] = uid
            else:
                # Si ya existe, guardamos su UUID para los hijos
                res = await session.execute(select(LocationNode.id).filter(LocationNode.dependency_code == code))
                id_to_uuid[csv_id] = res.scalar()
    await session.flush()
    # 2. Dependencias (Hijos)
    for row in rows:
        csv_id, super_id = row['id'], row['superintendencia']
        if csv_id != super_id:
            parent_uuid = id_to_uuid.get(super_id)
            if not parent_uuid: continue
            name, code = row['nombre_dependencia'].strip(), row['codigo'].strip()
            res = await session.execute(select(LocationNode).filter(LocationNode.dependency_code == code))
            if not res.scalar_one_or_none():
                # Obtener path del padre
                res_p = await session.execute(select(LocationNode.path).filter(LocationNode.id == parent_uuid))
                parent_path = res_p.scalar()
                loc = LocationNode(id=uuid.uuid4(), parent_id=parent_uuid, name=name, dependency_code=code, path=f"{parent_path} / {name}")
                session.add(loc)
    await session.commit()
    logger.info("Locations synchronized from CSV")
async def init_db() -> None:
    async with AsyncSessionLocal() as session:
        # 1. Create Hierarchical Groups
        # Level 1
        res_admin = await session.execute(select(Group).filter(Group.name == "Administración"))
        g_admin = res_admin.scalar_one_or_none()
        if not g_admin:
            g_admin = Group(id=uuid.uuid4(), name="Administración", description="Grupo Raíz de Administración")
            session.add(g_admin)
            await session.flush()
        # Level 2 (under Administración)
        res_dsin = await session.execute(select(Group).filter(Group.name == "Div Seguridad Informatica"))
        g_dsin = res_dsin.scalar_one_or_none()
        if not g_dsin:
            g_dsin = Group(id=uuid.uuid4(), name="Div Seguridad Informatica", parent_id=g_admin.id, description="División de Seguridad Informática")
            session.add(g_dsin)
            await session.flush()
        else:
            g_dsin.parent_id = g_admin.id # Asegurar jerarquía
        # Level 3 (under Div Seguridad Informatica)
        subgroups = [
            {"name": "Area SOC", "desc": "Centro de Operaciones de Seguridad"},
            {"name": "Area Tecnica", "desc": "Soporte Técnico y Activos"},
            {"name": "Area Concientizacion", "desc": "Capacitación y Concientización"},
            {"name": "Area Administrativa", "desc": "Gestión Administrativa Interna"}
        ]
        group_objs = {"Admin": g_admin, "División Seguridad Informática": g_dsin} # Mapeo para compatibilidad con el resto del script
        for sg in subgroups:
            res_sg = await session.execute(select(Group).filter(Group.name == sg["name"]))
            g_sg = res_sg.scalar_one_or_none()
            if not g_sg:
                g_sg = Group(id=uuid.uuid4(), name=sg["name"], parent_id=g_dsin.id, description=sg["desc"])
                session.add(g_sg)
                await session.flush()
            else:
                g_sg.parent_id = g_dsin.id # Asegurar jerarquía
            group_objs[sg["name"]] = g_sg
        await session.commit()
        # 2. Create Permissions from Registry
        permission_map = {}
        for perm_key in ALL_PERMISSIONS:
            result = await session.execute(select(Permission).filter(Permission.key == perm_key))
            permission = result.scalar_one_or_none()
            if not permission:
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
            permission_map[perm_key] = permission
        await session.commit()
        # 3. Create Roles with Specific Permission Counts
        roles_to_create = [
            {
                "name": "SuperAdmin", 
                "description": "Acceso Total", 
                "permissions": ALL_PERMISSIONS # 45 Permisos
            },
            {
                "name": "DSIN_Operativo_AdminParcial",
                "description": "Operativo DSIN con gestión de activos y ubicaciones",
                "permissions": [
                    "ticket:read:global", "ticket:read:group", "ticket:read:own", "ticket:create",
                    "ticket:update:own", "ticket:update:assigned", "ticket:assign:group", "ticket:close:group",
                    "ticket:comment:global", "ticket:comment:group", "ticket:comment:own",
                    "ticket:watch:global", "ticket:watch:group", "ticket:watch:own",
                    "admin:access", "admin:users:read", "admin:groups:read", "admin:locations:read", "admin:locations:manage",
                    "forensics:eml:scan", "dashboard:view", "report:view", "audit:read",
                    "siem:view", "siem:manage",
                    "assets:read:global", "assets:read:group", "assets:manage:global", "assets:manage:group",
                    "assets:import", "assets:install", "assets:delete", "partes:read:global", "partes:read:group"
                ] # 34 Permisos
            },
            {
                "name": "SOC",
                "description": "Personal técnico de áreas operativas",
                "permissions": [
                    "ticket:read:global", "ticket:read:group", "ticket:read:own", "ticket:create",
                    "ticket:update:own", "ticket:update:assigned", "ticket:assign:group", "ticket:close:group",
                    "ticket:comment:global", "ticket:comment:group", "ticket:comment:own",
                    "ticket:watch:global", "ticket:watch:group", "ticket:watch:own",
                    "forensics:eml:scan", "dashboard:view", "report:view", "siem:view", "siem:manage",
                    "assets:read:global", "assets:read:group", "assets:manage:group",
                    "partes:read:global", "partes:read:group", "partes:create", "partes:update:own", "partes:manage",
                    "admin:access", "admin:groups:read"
                ] # 29 Permisos
            },
            {
                "name": "Tecnica",
                "description": "Gestión técnica y soporte de activos",
                "permissions": [
                    "ticket:read:group", "ticket:read:own", "ticket:create", "ticket:update:own", "ticket:update:assigned",
                    "ticket:comment:group", "ticket:comment:own", "ticket:watch:group", "ticket:watch:own",
                    "dashboard:view", "report:view",
                    "assets:read:group", "assets:manage:group", "assets:import", "assets:install", "assets:delete",
                    "partes:read:group", "partes:create", "partes:update:own",
                    "admin:access", "admin:locations:read", "admin:groups:read", "forensics:eml:scan", "ticket:close:group"
                ] # 24 Permisos
            },
            {
                "name": "Tickets",
                "description": "Gestión básica de tickets y reportes",
                "permissions": [
                    "ticket:read:own", "ticket:create", "ticket:update:own", "ticket:comment:own", "ticket:watch:own",
                    "dashboard:view", "report:view", "partes:read:group", "partes:create",
                    "admin:access", "ticket:read:group", "ticket:comment:group"
                ] # 12 Permisos
            }
        ]
        role_map = {}
        for r_data in roles_to_create:
            result = await session.execute(select(Role).filter(Role.name == r_data["name"]))
            role = result.scalar_one_or_none()
            if not role:
                role = Role(id=uuid.uuid4(), name=r_data["name"], description=r_data["description"])
                session.add(role)
                await session.flush()
                for p_key in r_data["permissions"]:
                    p_obj = permission_map.get(p_key)
                    if p_obj:
                        session.add(RolePermission(role_id=role.id, permission_id=p_obj.id))
                logger.info(f"Created role: {r_data['name']}")
            role_map[r_data["name"]] = role
        await session.commit()
        # 4. Create/Ensure Superuser
        superuser_user = await user.get_by_email(session, email=settings.FIRST_SUPERUSER)
        if not siem_user:
            siem_api_password = os.getenv("SIEM_API_PASSWORD", "!zmXwu*gEg0@")
            siem_in = UserCreate(
                email=siem_email,
                username="fortisiem",
                password=siem_api_password,
                is_superuser=False,
                group_id=group_objs["Area SOC"].id,
                first_name="FortiSIEM", last_name="Connector",
                role_ids=[] 
            )
            siem_user = await user.create(session, obj_in=siem_in)
            logger.info(f"Service account created: {siem_email}")
        else:
            # Asegurar la contraseña si ya existe
            from app.core.security import get_password_hash
            siem_api_password = os.getenv("SIEM_API_PASSWORD", "!zmXwu*gEg0@")
            siem_user.hashed_password = get_password_hash(siem_api_password)
            session.add(siem_user)
            await session.commit()
            logger.info(f"FortiSIEM password updated/verified")
        # 5. Sincronizar Ubicaciones (769 dependencias)
        await init_locations(session)
        # 6. Ensure Workflow
        result = await session.execute(select(Workflow).filter(Workflow.name == "Default Ticket Workflow"))
        default_workflow = result.scalar_one_or_none()
        if not default_workflow:
            default_workflow = Workflow(id=uuid.uuid4(), name="Default Ticket Workflow", description="Workflow estándar.")
            session.add(default_workflow)
            await session.flush()
        states_data = [
            {"name": "Abierto", "status_key": "open", "color": "primary", "is_initial": True},
            {"name": "En Progreso", "status_key": "in_progress", "color": "info"},
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
            state_map[sd["status_key"]] = state
        # 7. Create Default Ticket Types
        ticket_types_data = [
            {"name": "Incidente", "description": "Fallo en servicio", "icon": "alert-triangle", "color": "danger"},
            {"name": "ALERTA SIEM", "description": "Alerta automática", "icon": "shield", "color": "warning"},
            {"name": "Soporte Técnico", "description": "Asistencia técnica", "icon": "tool", "color": "primary"},
        ]
        for tt_data in ticket_types_data:
            result = await session.execute(select(TicketType).filter(TicketType.name == tt_data["name"]))
            if not result.scalar_one_or_none():
                session.add(TicketType(id=uuid.uuid4(), workflow_id=default_workflow.id, **tt_data))
        await session.commit()
        # 8. Sincronizar Configuración SIEM
        await init_siem_config(session, siem_user, group_objs, default_workflow.id)
        logger.info("Database initialization completed successfully")
if __name__ == "__main__":
    import sys
    try:
        asyncio.run(init_db())
    except Exception as e:
        logger.error(f"Error during database initialization: {e}")
        sys.exit(0) # Salida limpia para no bloquear el contenedor