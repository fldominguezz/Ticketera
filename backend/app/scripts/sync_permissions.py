import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
import uuid
from app.db.session import AsyncSessionLocal
from app.db.models.iam import Role, Permission, RolePermission
from app.core.permissions import PermissionEnum
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
async def sync_permissions() -> None:
    async with AsyncSessionLocal() as session:
        # 1. Eliminar permisos antiguos o redundantes que no están en el Enum actual
        valid_keys = [p.value for p in PermissionEnum]
        # Opcional: Eliminar los que no son válidos (CUIDADO con CUSTOM permissions si existieran)
        # Por ahora solo limpiaremos los de ticket: que no tengan scope si el enum dice que deben tenerlo
        # result = await session.execute(delete(Permission).where(Permission.key.like('ticket:%')).where(Permission.key.notin_(valid_keys)))
        # 2. Asegurar que todos los permisos del Enum existan con los metadatos correctos
        permissions_to_sync = [
            {"key": PermissionEnum.TICKET_READ_GLOBAL, "name": "Tickets: Leer Global", "module": "TICKETS", "scope_type": "global"},
            {"key": PermissionEnum.TICKET_READ_GROUP, "name": "Tickets: Leer Grupo", "module": "TICKETS", "scope_type": "group"},
            {"key": PermissionEnum.TICKET_READ_OWN, "name": "Tickets: Leer Propios", "module": "TICKETS", "scope_type": "own"},
            {"key": PermissionEnum.TICKET_CREATE, "name": "Tickets: Crear", "module": "TICKETS", "scope_type": "none"},
            {"key": PermissionEnum.TICKET_UPDATE_OWN, "name": "Tickets: Editar Propios", "module": "TICKETS", "scope_type": "own"},
            {"key": PermissionEnum.TICKET_UPDATE_ASSIGNED, "name": "Tickets: Editar Asignados", "module": "TICKETS", "scope_type": "own"},
            {"key": PermissionEnum.TICKET_ASSIGN_GROUP, "name": "Tickets: Asignar en Grupo", "module": "TICKETS", "scope_type": "group"},
            {"key": PermissionEnum.TICKET_CLOSE_GROUP, "name": "Tickets: Cerrar en Grupo", "module": "TICKETS", "scope_type": "group"},
            {"key": "ticket:comment", "name": "Tickets: Comentar (Maestro)", "module": "TICKETS", "scope_type": "none"},
            {"key": "ticket:watch", "name": "Tickets: Observar/Seguir (Maestro)", "module": "TICKETS", "scope_type": "none"},
            {"key": PermissionEnum.TICKET_COMMENT_GLOBAL, "name": "Tickets: Comentar Global", "module": "TICKETS", "scope_type": "global"},
            {"key": PermissionEnum.TICKET_COMMENT_GROUP, "name": "Tickets: Comentar en Grupo", "module": "TICKETS", "scope_type": "group"},
            {"key": PermissionEnum.TICKET_COMMENT_OWN, "name": "Tickets: Comentar Propios", "module": "TICKETS", "scope_type": "own"},
            {"key": PermissionEnum.TICKET_WATCH_GLOBAL, "name": "Tickets: Observar Global", "module": "TICKETS", "scope_type": "global"},
            {"key": PermissionEnum.TICKET_WATCH_GROUP, "name": "Tickets: Observar en Grupo", "module": "TICKETS", "scope_type": "group"},
            {"key": PermissionEnum.TICKET_WATCH_OWN, "name": "Tickets: Observar Propios", "module": "TICKETS", "scope_type": "own"},
        ]
        for p_data in permissions_to_sync:
            result = await session.execute(select(Permission).filter(Permission.key == p_data["key"]))
            perm = result.scalar_one_or_none()
            if not perm:
                session.add(Permission(id=uuid.uuid4(), **p_data))
                logger.info(f"Creado permiso: {p_data['key']}")
            else:
                perm.name = p_data["name"]
                perm.module = p_data["module"]
                perm.scope_type = p_data["scope_type"]
                logger.info(f"Actualizado permiso: {p_data['key']}")
        await session.commit()
        # 3. Asignar todos los permisos al rol Administrator
        result = await session.execute(select(Role).filter(Role.name == "Administrator"))
        admin_role = result.scalar_one_or_none()
        if admin_role:
            # Obtener todos los permisos actuales
            result = await session.execute(select(Permission))
            all_perms = result.scalars().all()
            # Obtener permisos ya asignados
            result = await session.execute(select(RolePermission.permission_id).where(RolePermission.role_id == admin_role.id))
            assigned_ids = set(result.scalars().all())
            for p in all_perms:
                if p.id not in assigned_ids:
                    session.add(RolePermission(role_id=admin_role.id, permission_id=p.id))
                    logger.info(f"Asignado {p.key} a Administrator")
            await session.commit()
            logger.info("Rol Administrator actualizado con todas las capacidades.")
if __name__ == "__main__":
    asyncio.run(sync_permissions())
