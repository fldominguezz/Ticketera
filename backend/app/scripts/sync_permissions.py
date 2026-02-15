import asyncio
import logging
import uuid
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.db.models.iam import Role, Permission, RolePermission
from app.core.permissions import ALL_PERMISSIONS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def sync_permissions():
    async with AsyncSessionLocal() as session:
        # 1. Obtener el rol SuperAdmin
        res_role = await session.execute(select(Role).filter(Role.name == "SuperAdmin"))
        role_sa = res_role.scalar_one_or_none()
        
        if not role_sa:
            logger.error("No se encontró el rol SuperAdmin. Ejecute initial_data primero.")
            return

        # 2. Sincronizar Permisos
        count_new = 0
        current_perms = {}
        
        for perm_key in ALL_PERMISSIONS:
            result = await session.execute(select(Permission).filter(Permission.key == perm_key))
            permission = result.scalar_one_or_none()
            
            if not permission:
                permission = Permission(
                    id=uuid.uuid4(), 
                    key=perm_key, 
                    name=perm_key.replace(":", " ").title(), 
                    module=perm_key.split(":")[0].upper()
                )
                session.add(permission)
                await session.flush()
                count_new += 1
                logger.info(f"Nuevo permiso registrado: {perm_key}")
            
            current_perms[perm_key] = permission

        # 3. Asegurar que SuperAdmin tenga TODOS los permisos (incluyendo los nuevos)
        count_linked = 0
        for perm in current_perms.values():
            res_link = await session.execute(
                select(RolePermission).filter(
                    RolePermission.role_id == role_sa.id,
                    RolePermission.permission_id == perm.id
                )
            )
            if not res_link.scalar_one_or_none():
                session.add(RolePermission(role_id=role_sa.id, permission_id=perm.id))
                count_linked += 1

        await session.commit()
        logger.info(f"Sincronización completada. {count_new} permisos creados, {count_linked} nuevos vínculos con SuperAdmin.")

if __name__ == "__main__":
    asyncio.run(sync_permissions())
