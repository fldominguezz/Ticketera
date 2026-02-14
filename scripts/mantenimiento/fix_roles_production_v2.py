import asyncio
from sqlalchemy import select, delete, update
from app.db.session import AsyncSessionLocal
from app.db.models.iam import Role, Permission, RolePermission, UserRole
import sys
import os

sys.path.append(os.getcwd())

async def cleanup_roles():
    async with AsyncSessionLocal() as db:
        print("Starting cleanup...")
        
        # 1. Definir roles objetivo
        target_role_names = ["SOC_ANALYST", "TECH_ANALYST", "CONCIENTIZACION", "ADMINISTRACION", "Administrator"]
        
        # Crear roles si no existen
        for r_name in target_role_names:
            res = await db.execute(select(Role).where(Role.name == r_name))
            if not res.scalar_one_or_none():
                db.add(Role(name=r_name, description=f"Rol oficial {r_name}"))
        await db.flush()

        # Obtener mapeo de roles actuales
        res_all_roles = await db.execute(select(Role))
        roles_by_name = {r.name: r for r in res_all_roles.scalars().all()}

        # 2. Mapeo de migración
        migration = {
            "Area SOC": "SOC_ANALYST",
            "Area Tecnica": "TECH_ANALYST",
            "Area Concientizacion": "CONCIENTIZACION",
            "Area Administrativa": "ADMINISTRACION",
            "Division Seguridad Informatica": "SOC_ANALYST",
            "DIVISION_OFFICER": "SOC_ANALYST"
        }

        # 3. Migrar usuarios
        for old, new in migration.items():
            if old in roles_by_name and new in roles_by_name:
                await db.execute(
                    update(UserRole).where(UserRole.role_id == roles_by_name[old].id).values(role_id=roles_by_name[new].id)
                )
                print(f"Migrated users from {old} to {new}")

        # 4. Limpiar permisos de roles a eliminar para evitar FK error
        roles_to_del = [name for name in roles_by_name.keys() if name not in target_role_names]
        for r_name in roles_to_del:
            rid = roles_by_name[r_name].id
            await db.execute(delete(RolePermission).where(RolePermission.role_id == rid))
            await db.execute(delete(Role).where(Role.id == rid))
            print(f"Deleted {r_name}")

        # 5. Configurar permisos reales para los roles finales
        res_perms = await db.execute(select(Permission))
        p_map = {p.name: p.id for p in res_perms.scalars().all()}
        
        base = ["ticket:create", "ticket:read:group", "ticket:manage:own", "dashboard:view:stats", "audit:view"]
        matrix = {
            "SOC_ANALYST": base + ["siem:manage", "siem:view", "forensics:eml", "asset:view", "asset:modify", "report:create", "report:view:own"],
            "TECH_ANALYST": base + ["asset:view", "asset:modify", "asset:install:create", "audit:view:all", "report:create", "report:view:own"],
            "CONCIENTIZACION": base + ["report:create", "report:view:own"],
            "ADMINISTRACION": base + ["report:create", "report:view:own"],
            "Administrator": list(p_map.keys())
        }

        for r_name, p_names in matrix.items():
            rid = roles_by_name[r_name].id
            await db.execute(delete(RolePermission).where(RolePermission.role_id == rid))
            for pn in p_names:
                if pn in p_map:
                    db.add(RolePermission(role_id=rid, permission_id=p_map[pn]))
        
        await db.commit()
        print("✅ Success.")

if __name__ == "__main__":
    asyncio.run(cleanup_roles())
