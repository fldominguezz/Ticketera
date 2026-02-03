import asyncio
from sqlalchemy import select, delete, update
from app.db.session import AsyncSessionLocal
from app.db.models.iam import Role, Permission, RolePermission, UserRole
import sys
import os

sys.path.append(os.getcwd())

async def fix_roles_reverse():
    async with AsyncSessionLocal() as db:
        print("Reverting roles to friendly names...")
        
        # 1. Definir roles finales (en español)
        target_role_names = ["Area SOC", "Area Tecnica", "Area Concientizacion", "Area Administrativa", "Administrator"]
        
        # Crear roles si no existen
        for r_name in target_role_names:
            res = await db.execute(select(Role).where(Role.name == r_name))
            if not res.scalar_one_or_none():
                db.add(Role(name=r_name, description=f"Rol para {r_name}"))
        await db.flush()

        # Obtener mapeo de roles actuales
        res_all_roles = await db.execute(select(Role))
        roles_by_name = {r.name: r for r in res_all_roles.scalars().all()}

        # 2. Mapeo de migración (de INGLÉS a ESPAÑOL)
        migration = {
            "SOC_ANALYST": "Area SOC",
            "TECH_ANALYST": "Area Tecnica",
            "CONCIENTIZACION": "Area Concientizacion",
            "ADMINISTRACION": "Area Administrativa",
            "DIVISION_OFFICER": "Area SOC"
        }

        # 3. Migrar usuarios
        for old, new in migration.items():
            if old in roles_by_name and new in roles_by_name:
                await db.execute(
                    update(UserRole).where(UserRole.role_id == roles_by_name[old].id).values(role_id=roles_by_name[new].id)
                )
                print(f"Migrated users from {old} to {new}")

        # 4. Limpiar permisos de roles técnicos para eliminarlos
        roles_to_del = ["SOC_ANALYST", "TECH_ANALYST", "CONCIENTIZACION", "ADMINISTRACION", "DIVISION_OFFICER"]
        for r_del in roles_to_del:
            if r_del in roles_by_name:
                rid = roles_by_name[r_del].id
                await db.execute(delete(RolePermission).where(RolePermission.role_id == rid))
                await db.execute(delete(Role).where(Role.id == rid))
                print(f"Deleted technical role: {r_del}")

        # 5. Configurar permisos reales para los roles en ESPAÑOL
        res_perms = await db.execute(select(Permission))
        p_map = {p.name: p.id for p in res_perms.scalars().all()}
        
        base = ["ticket:create", "ticket:read:group", "ticket:manage:own", "dashboard:view:stats", "audit:view"]
        matrix = {
            "Area SOC": base + ["siem:manage", "siem:view", "forensics:eml", "asset:view", "asset:modify", "report:create", "report:view:own"],
            "Area Tecnica": base + ["asset:view", "asset:modify", "asset:install:create", "audit:view:all", "report:create", "report:view:own"],
            "Area Concientizacion": base + ["report:create", "report:view:own"],
            "Area Administrativa": base + ["report:create", "report:view:own"],
            "Administrator": list(p_map.keys())
        }

        for r_name, p_names in matrix.items():
            rid = roles_by_name[r_name].id
            await db.execute(delete(RolePermission).where(RolePermission.role_id == rid))
            for pn in p_names:
                if pn in p_map:
                    db.add(RolePermission(role_id=rid, permission_id=p_map[pn]))
        
        await db.commit()
        print("✅ Roles restored to Spanish friendly names.")

if __name__ == "__main__":
    asyncio.run(fix_roles_reverse())
