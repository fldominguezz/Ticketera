import asyncio
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.db.models import User

async def unlock_admin():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).filter(User.username == "admin"))
        user = result.scalar_one_or_none()
        if user:
            user.failed_login_attempts = 0
            user.locked_until = None
            await session.commit()
            print("ADMIN_DESBLOQUEADO_EXITOSAMENTE")
        else:
            print("ERROR: No se encontro el usuario admin")

if __name__ == "__main__":
    asyncio.run(unlock_admin())
