import asyncio
import uuid
from sqlalchemy.future import select
from sqlalchemy import delete
from app.db.session import AsyncSessionLocal
from app.db.models.iam import Role, Permission, RolePermission
from app.core.permissions import PermissionEnum

# Mapeo manual mejorado para agrupar las claves raras
MODULE_MAP = {
    "dashboard": "DASHBOARD",
    "ticket": "TICKETS",
    "tickets": "TICKETS",
    "siem": "MONITOREO SOC",
    "soc": "MONITOREO SOC",
    "asset": "INVENTARIO",
    "assets": "INVENTARIO",
    "admin": "SISTEMA E IAM",
    "audit": "SISTEMA E IAM",
    "sla": "SISTEMA E IAM",
    "ai": "INTELIGENCIA ARTIFICIAL"
}

async def sync():
    async with AsyncSessionLocal() as db:
        print("--- REPARACIÓN INTEGRAL DE PERMISOS ---")
        valid_keys = [p.value for p in PermissionEnum]
        
        # 1. Borrar lo que NO es válido (Purga real)
        print("Eliminando permisos no reconocidos...")
        await db.execute(
            delete(RolePermission).where(
                RolePermission.permission_id.in_(
                    select(Permission.id).where(Permission.key.notin_(valid_keys))
                )
            )
        )
        await db.execute(delete(Permission).where(Permission.key.notin_(valid_keys)))
        
        # 2. Asegurar claves existentes
        used_names = set()
        for key in valid_keys:
            res = await db.execute(select(Permission).where(Permission.key == key))
            db_p = res.scalar_one_or_none()
            
            # Determinar módulo por prefijo (usando el separador : o .)
            prefix = key.replace('.', ':').split(':')[0]
            module = MODULE_MAP.get(prefix, "SISTEMA E IAM")
            
            # Generar nombre base
            base_name = key.replace(':', ' ').replace('.', ' ').replace('_', ' ').title()
            
            # Si el nombre ya fue usado por OTRA clave en esta corrida, le agregamos el key para diferenciar
            if base_name in used_names:
                final_name = f"{base_name} ({key})"
            else:
                final_name = base_name
            
            used_names.add(final_name)
            
            if not db_p:
                print(f"Creando clave faltante: {key} -> {final_name}")
                db_p = Permission(
                    id=uuid.uuid4(),
                    key=key,
                    name=final_name,
                    module=module,
                    description=f"Permiso para {key}"
                )
                db.add(db_p)
            else:
                db_p.module = module
                db_p.name = final_name

        await db.flush()

        # 3. Rol Administrator (Full)
        res = await db.execute(select(Role).where(Role.name == "Administrator"))
        admin_role = res.scalar_one_or_none()
        if not admin_role:
            admin_role = Role(id=uuid.uuid4(), name="Administrator", description="Superusuario")
            db.add(admin_role)
            await db.flush()

        # Reasignar todo
        await db.execute(delete(RolePermission).where(RolePermission.role_id == admin_role.id))
        res_all = await db.execute(select(Permission))
        for p in res_all.scalars().all():
            db.add(RolePermission(role_id=admin_role.id, permission_id=p.id))

        await db.commit()
        print("--- SINCRONIZACIÓN COMPLETADA ---")

if __name__ == "__main__":
    asyncio.run(sync())
