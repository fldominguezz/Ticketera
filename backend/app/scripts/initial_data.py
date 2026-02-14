import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import uuid

from app.db.session import AsyncSessionLocal
from app.crud.crud_user import user
from app.schemas.user import UserCreate
from app.db.models import Group, User, Workflow, WorkflowState, WorkflowTransition
from app.db.models.iam import Role, Permission, UserRole, RolePermission
from app.core.config import settings
from app.core.permissions import PermissionEnum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_db() -> None:
    async with AsyncSessionLocal() as session:
        # 1. Asegurar Grupo Admin Base
        result = await session.execute(select(Group).filter(Group.name == "Admin"))
        group = result.scalar_one_or_none()
        if not group:
            group = Group(id=uuid.uuid4(), name="Admin", description="Administrators Group")
            session.add(group)
            await session.commit()
            await session.refresh(group)

        # 2. SINCRONIZACIÓN DEL REGISTRO DE PERMISOS (Diccionario de Capacidades)
        # Solo mantenemos los permisos actualizados para que aparezcan en el Panel Admin.
        permissions_data = [
            # TICKETS
            {"key": PermissionEnum.TICKET_READ_GLOBAL, "name": "Tickets: Leer Global", "module": "TICKETS", "scope_type": "global"},
            {"key": PermissionEnum.TICKET_READ_GROUP, "name": "Tickets: Leer Grupo", "module": "TICKETS", "scope_type": "group"},
            {"key": PermissionEnum.TICKET_READ_OWN, "name": "Tickets: Leer Propios", "module": "TICKETS", "scope_type": "own"},
            {"key": PermissionEnum.TICKET_CREATE, "name": "Tickets: Crear", "module": "TICKETS", "scope_type": "none"},
            {"key": PermissionEnum.TICKET_UPDATE_OWN, "name": "Tickets: Editar Propios", "module": "TICKETS", "scope_type": "own"},
            {"key": PermissionEnum.TICKET_UPDATE_ASSIGNED, "name": "Tickets: Editar Asignados", "module": "TICKETS", "scope_type": "own"},
            {"key": PermissionEnum.TICKET_ASSIGN_GROUP, "name": "Tickets: Asignar en Grupo", "module": "TICKETS", "scope_type": "group"},
            {"key": PermissionEnum.TICKET_CLOSE_GROUP, "name": "Tickets: Cerrar en Grupo", "module": "TICKETS", "scope_type": "group"},
            {"key": PermissionEnum.TICKET_COMMENT_GLOBAL, "name": "Tickets: Comentar Global", "module": "TICKETS", "scope_type": "global"},
            {"key": PermissionEnum.TICKET_COMMENT_GROUP, "name": "Tickets: Comentar en Grupo", "module": "TICKETS", "scope_type": "group"},
            {"key": PermissionEnum.TICKET_COMMENT_OWN, "name": "Tickets: Comentar Propios", "module": "TICKETS", "scope_type": "own"},
            {"key": PermissionEnum.TICKET_WATCH_GLOBAL, "name": "Tickets: Observar Global", "module": "TICKETS", "scope_type": "global"},
            {"key": PermissionEnum.TICKET_WATCH_GROUP, "name": "Tickets: Observar en Grupo", "module": "TICKETS", "scope_type": "group"},
            {"key": PermissionEnum.TICKET_WATCH_OWN, "name": "Tickets: Observar Propios", "module": "TICKETS", "scope_type": "own"},
            
            # PARTES
            {"key": PermissionEnum.PARTES_READ_GLOBAL, "name": "Partes: Leer Global", "module": "PARTES", "scope_type": "global"},
            {"key": PermissionEnum.PARTES_READ_GROUP, "name": "Partes: Leer Grupo", "module": "PARTES", "scope_type": "group"},
            {"key": PermissionEnum.PARTES_CREATE, "name": "Partes: Crear", "module": "PARTES", "scope_type": "none"},
            {"key": PermissionEnum.PARTES_UPDATE_OWN, "name": "Partes: Editar Propios", "module": "PARTES", "scope_type": "own"},
            {"key": PermissionEnum.PARTES_MANAGE, "name": "Partes: Gestión Total", "module": "PARTES", "scope_type": "global"},

            # SIEM
            {"key": PermissionEnum.SIEM_VIEW, "name": "SIEM: Ver Alertas", "module": "SIEM", "scope_type": "none"},
            {"key": PermissionEnum.SIEM_MANAGE, "name": "SIEM: Gestionar/Promover", "module": "SIEM", "scope_type": "none"},

            # FORENSICS
            {"key": PermissionEnum.FORENSICS_EML_SCAN, "name": "Forense: Escáner EML", "module": "FORENSE", "scope_type": "none"},

            # AUDITORÍA
            {"key": PermissionEnum.AUDIT_READ, "name": "Admin: Ver Auditoría", "module": "AUDITORIA", "scope_type": "global"},

            # ADMIN GENERAL
            {"key": PermissionEnum.ADMIN_ACCESS, "name": "Admin: Acceso Panel", "module": "ADMINISTRACION", "scope_type": "none"},
            {"key": PermissionEnum.ADMIN_USERS_READ, "name": "Admin: Leer Usuarios", "module": "ADMINISTRACION", "scope_type": "global"},
            {"key": PermissionEnum.ADMIN_USERS_MANAGE, "name": "Admin: Gestionar Usuarios", "module": "ADMINISTRACION", "scope_type": "global"},
            {"key": PermissionEnum.ADMIN_ROLES_READ, "name": "Admin: Leer Roles", "module": "ADMINISTRACION", "scope_type": "global"},
            {"key": PermissionEnum.ADMIN_ROLES_MANAGE, "name": "Admin: Gestionar Roles", "module": "ADMINISTRACION", "scope_type": "global"},
            {"key": PermissionEnum.ADMIN_GROUPS_READ, "name": "Admin: Leer Grupos", "module": "ADMINISTRACION", "scope_type": "global"},
            {"key": PermissionEnum.ADMIN_GROUPS_MANAGE, "name": "Admin: Gestionar Grupos", "module": "ADMINISTRACION", "scope_type": "global"},
            {"key": PermissionEnum.ADMIN_LOCATIONS_READ, "name": "Admin: Leer Ubicaciones", "module": "ADMINISTRACION", "scope_type": "global"},
            {"key": PermissionEnum.ADMIN_LOCATIONS_MANAGE, "name": "Admin: Gestionar Ubicaciones", "module": "ADMINISTRACION", "scope_type": "global"},
            {"key": PermissionEnum.ADMIN_CATALOGS_READ, "name": "Admin: Leer Catálogos", "module": "ADMINISTRACION", "scope_type": "global"},
            {"key": PermissionEnum.ADMIN_CATALOGS_MANAGE, "name": "Admin: Gestionar Catálogos", "module": "ADMINISTRACION", "scope_type": "global"},
            {"key": PermissionEnum.ADMIN_SETTINGS_READ, "name": "Admin: Leer Configuración", "module": "ADMINISTRACION", "scope_type": "global"},
            {"key": PermissionEnum.ADMIN_SETTINGS_MANAGE, "name": "Admin: Configuración Sistema", "module": "ADMINISTRACION", "scope_type": "global"},
            {"key": PermissionEnum.DASHBOARD_VIEW, "name": "Ver Dashboard", "module": "DASHBOARD", "scope_type": "none"},

            # ACTIVOS
            {"key": PermissionEnum.ASSETS_READ_GLOBAL, "name": "Activos: Leer Global", "module": "ACTIVOS", "scope_type": "global"},
            {"key": PermissionEnum.ASSETS_READ_GROUP, "name": "Activos: Leer Grupo", "module": "ACTIVOS", "scope_type": "group"},
            {"key": PermissionEnum.ASSETS_MANAGE_GLOBAL, "name": "Activos: Gestión Total", "module": "ACTIVOS", "scope_type": "global"},
            {"key": PermissionEnum.ASSETS_MANAGE_GROUP, "name": "Activos: Gestión Grupo", "module": "ACTIVOS", "scope_type": "group"},
            {"key": PermissionEnum.ASSETS_IMPORT, "name": "Activos: Importar", "module": "ACTIVOS", "scope_type": "none"},
            {"key": PermissionEnum.ASSETS_INSTALL, "name": "Activos: Instalar Agente", "module": "ACTIVOS", "scope_type": "none"},
            {"key": PermissionEnum.ASSETS_DELETE, "name": "Activos: Eliminar", "module": "ACTIVOS", "scope_type": "none"},
        ]
        
        for p in permissions_data:
            result = await session.execute(select(Permission).filter(Permission.key == p["key"]))
            perm = result.scalar_one_or_none()
            if not perm:
                session.add(Permission(id=uuid.uuid4(), **p))
            else:
                perm.name = p["name"]
                perm.module = p["module"]
                perm.scope_type = p["scope_type"]
                session.add(perm)
        
        await session.commit()
        logger.info("Registro de permisos actualizado.")

        # 3. Asegurar Rol Administrator y Superuser
        # Solo garantizamos que el rol Administrator exista y el usuario admin lo tenga.
        result = await session.execute(select(Role).filter(Role.name == "Administrator"))
        admin_role = result.scalar_one_or_none()
        if not admin_role:
            admin_role = Role(id=uuid.uuid4(), name="Administrator", description="Acceso total al sistema")
            session.add(admin_role)
            await session.commit()
            await session.refresh(admin_role)

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
            await user.create(session, obj_in=user_in)
            logger.info("Superuser creado.")
        
        await session.commit()

if __name__ == "__main__":
    asyncio.run(init_db())