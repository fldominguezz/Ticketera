import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.db.models.iam import Role, Permission, RolePermission
from app.core.permissions import PermissionEnum
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
async def fix_roles() -> None:
    async with AsyncSessionLocal() as session:
        # 1. Obtener Permisos Clave
        perms_to_assign = [
            PermissionEnum.FORENSICS_EML_SCAN,
            PermissionEnum.SIEM_VIEW,
            PermissionEnum.SIEM_MANAGE,
            PermissionEnum.AUDIT_READ,
            PermissionEnum.ASSETS_READ_GLOBAL,
            PermissionEnum.ASSETS_MANAGE_GLOBAL,
            PermissionEnum.ASSETS_IMPORT,
            PermissionEnum.ASSETS_INSTALL,
            PermissionEnum.ASSETS_DELETE,
            PermissionEnum.DASHBOARD_VIEW
        ]
        perm_objs = []
        for p_key in perms_to_assign:
            res = await session.execute(select(Permission).where(Permission.key == p_key))
            perm = res.scalar_one_or_none()
            if perm:
                perm_objs.append(perm)
        # 2. Buscar roles únicos por nombre
        target_role_names = ["Area SOC", "Div Seguridad Informatica"]
        roles_to_update = {}
        for name in target_role_names:
            # Buscar roles que empiecen con el nombre (para atrapar con espacios extra)
            res = await session.execute(select(Role).where(Role.name.ilike(f"{name}%")))
            found_roles = res.scalars().all()
            for r in found_roles:
                roles_to_update[r.id] = r # Usar dict para evitar duplicados por ID
        for role_id, role in roles_to_update.items():
            logger.info(f"Procesando rol: {role.name} ({role.id})")
            # Obtener permisos actuales
            current_perms_res = await session.execute(
                select(RolePermission).where(RolePermission.role_id == role.id)
            )
            current_perm_ids = {rp.permission_id for rp in current_perms_res.scalars().all()}
            for perm in perm_objs:
                if perm.id not in current_perm_ids:
                    session.add(RolePermission(role_id=role.id, permission_id=perm.id))
                    logger.info(f"  -> Agregando permiso: {perm.key}")
                    current_perm_ids.add(perm.id) # Actualizar local set para evitar dupes en el loop
        await session.commit()
        logger.info("Roles corregidos exitosamente.")
if __name__ == "__main__":
    asyncio.run(fix_roles())