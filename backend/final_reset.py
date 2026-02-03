import asyncio
from sqlalchemy import delete
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.db.models.group import Group
from app.db.models.iam import Role, UserRole
from app.db.models.session import Session
from app.db.models.audit_log import AuditLog
from app.core.security import get_password_hash
from sqlalchemy.future import select

async def clean_and_reset():
    async with AsyncSessionLocal() as db:
        print("🧹 Limpiando dependencias de usuarios...")
        await db.execute(delete(Session))
        await db.execute(delete(AuditLog))
        await db.execute(delete(UserRole))
        await db.execute(delete(User))
        
        # Obtener SuperAdmin Role y Admin Group
        res_r = await db.execute(select(Role).where(Role.name == "SuperAdmin"))
        super_role = res_r.scalar_one()
        
        res_g = await db.execute(select(Group).where(Group.name == "Administrator"))
        admin_group = res_g.scalar_one()

        users = [
            {
                "u": "admin", 
                "e": "admin@example.com", 
                "p": "admin123"
            },
            {
                "u": "FortiSIEM", 
                "e": "fortisiem@example.com", 
                "p": "9y\;)P[s}obNd3W-"
            }
        ]

        for u_data in users:
            new_u = User(
                username=u_data["u"],
                email=u_data["e"],
                hashed_password=get_password_hash(u_data["p"]),
                first_name=u_data["u"],
                last_name="System",
                is_active=True,
                is_superuser=True,
                group_id=admin_group.id,
                policy_exempt=True,
                force_password_change=False,
                is_2fa_enabled=False
            )
            db.add(new_u)
            await db.flush()
            db.add(UserRole(user_id=new_u.id, role_id=super_role.id))
            print(f"✅ Creado: {u_data['u']} / {u_data['e']}")

        await db.commit()
        print("🏁 RESET EXITOSO.")

if __name__ == "__main__":
    asyncio.run(clean_and_reset())