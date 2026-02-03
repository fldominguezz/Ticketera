import asyncio
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.db.models.group import Group
from app.db.models.iam import Role, UserRole
from app.core.security import get_password_hash

async def restore_users():
    async with AsyncSessionLocal() as db:
        # 1. Obtener grupo y rol base
        res_g = await db.execute(select(Group).where(Group.name == "Administrator"))
        admin_group = res_g.scalar_one_or_none()
        
        res_r = await db.execute(select(Role).where(Role.name == "SuperAdmin"))
        admin_role = res_r.scalar_one_or_none()

        if not admin_group or not admin_role:
            print("❌ Error: Bootstrap base no encontrado. Ejecute bootstrap_iam.py primero.")
            return

        users = [
            {"u": "Admin", "p": "admin123", "e": "admin@ticketera.local"},
            {"u": "FortiSIEM", "p": "9y\\;)P[s}obNd3W-", "e": "fortisiem@integration.local"}
        ]

        for data in users:
            res_u = await db.execute(select(User).where(User.username == data["u"]))
            user = res_u.scalar_one_or_none()
            if not user:
                user = User(
                    username=data["u"],
                    email=data["e"],
                    hashed_password=get_password_hash(data["p"]),
                    first_name=data["u"],
                    last_name="System",
                    is_active=True,
                    is_superuser=True,
                    group_id=admin_group.id,
                    policy_exempt=True,
                    force_password_change=False,
                    is_2fa_enabled=False
                )
                db.add(user)
                await db.flush()
                db.add(UserRole(user_id=user.id, role_id=admin_role.id))
                print(f"✅ Usuario restaurado: {data['u']}")
        
        await db.commit()
        print("🏁 Restauración completada.")

if __name__ == "__main__":
    asyncio.run(restore_users())
