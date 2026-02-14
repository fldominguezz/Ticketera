import asyncio
from sqlalchemy import select, delete, update
from sqlalchemy.orm import selectinload
from app.db.session import AsyncSessionLocal
from app.db.models.iam import Role, Permission, RolePermission, UserRole
from app.db.models.user import User
import sys
import os

sys.path.append(os.getcwd())

async def cleanup_roles():
    async with AsyncSessionLocal() as db:
        print("Starting roles cleanup...")
        
        # 1. Definir la matriz de permisos deseada
        # Permisos base para todos los operativos
        base_perms = ["ticket:create", "ticket:read:group", "ticket:manage:own", "dashboard:view:stats", "audit:view"]
        
        roles_matrix = {
            "SOC_ANALYST": base_perms + ["siem:manage", "siem:view", "forensics:eml", "asset:view", "asset:modify", "report:create", "report:view:own"],
            "TECH_ANALYST": base_perms + ["asset:view", "asset:modify", "asset:install:create", "audit:view:all", "report:create", "report:view:own"],
            "CONCIENTIZACION": base_perms + ["report:create", "report:view:own"],
            "ADMINISTRACION": base_perms + ["report:create", "report:view:own"],
            "Administrator": [] # Este lo manejamos aparte (tiene todo)
        }

        # 2. Obtener todos los permisos para mapear IDs
        res_perms = await db.execute(select(Permission))
        all_perms = {p.name: p.id for p in res_perms.scalars().all()}

        # 3. Mapeo de nombres viejos a nuevos para migrar usuarios
        migration_map = {
            "Area SOC": "SOC_ANALYST",
            "Area Tecnica": "TECH_ANALYST",
            "Area Concientizacion": "CONCIENTIZACION",
            "Area Administrativa": "ADMINISTRACION",
            "Division Seguridad Informatica": "SOC_ANALYST", # Lo mandamos a SOC ya que DIVISION_OFFICER desaparece
            "DIVISION_OFFICER": "SOC_ANALYST"
        }

        # 4. Crear/Asegurar los 4 roles destino + Administrator
        target_roles = {}
        for r_name in roles_matrix.keys():
            res = await db.execute(select(Role).where(Role.name == r_name))
            role = res.scalar_one_or_none()
            if not role:
                role = Role(name=r_name, description=f"Rol oficial para {r_name}")
                db.add(role)
                await db.flush()
            target_roles[r_name] = role

        # 5. Migrar usuarios de roles viejos a nuevos
        for old_name, new_name in migration_map.items():
            res_old = await db.execute(select(Role).where(Role.name == old_name))
            old_role = res_old.scalar_one_or_none()
            if old_role:
                new_role = target_roles[new_name]
                # Actualizar todos los UserRole que apunten al viejo
                await db.execute(
                    update(UserRole).where(UserRole.role_id == old_role.id).values(role_id=new_role.id)
                )
                print(f"Migrated users from '{old_name}' to '{new_name}'")

        # 6. Eliminar roles obsoletos
        roles_to_delete = ["Area SOC", "Area Tecnica", "Area Concientizacion", "Area Administrativa", "Division Seguridad Informatica", "DIVISION_OFFICER"]
        for r_del in roles_to_delete:
            await db.execute(delete(Role).where(Role.name == r_del))
            print(f"Deleted obsolete role: {r_del}")

        # 7. Sincronizar Permisos de los 4 roles
        for r_name, p_names in roles_matrix.items():
            if r_name == "Administrator":
                # Al admin le damos TODO
                await db.execute(delete(RolePermission).where(RolePermission.role_id == target_roles[r_name].id))
                for pid in all_perms.values():
                    db.add(RolePermission(role_id=target_roles[r_name].id, permission_id=pid))
            else:
                await db.execute(delete(RolePermission).where(RolePermission.role_id == target_roles[r_name].id))
                for pn in p_names:
                    if pn in all_perms:
                        db.add(RolePermission(role_id=target_roles[r_name].id, permission_id=all_perms[pn]))
        
        await db.commit()
        print("✅ Clean roles setup complete.")

if __name__ == "__main__":
    asyncio.run(cleanup_roles())
