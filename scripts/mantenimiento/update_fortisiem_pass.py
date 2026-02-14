import asyncio
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.db.models import User
from app.core.security import get_password_hash

async def update_fortisiem_password():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).filter(User.username == "fortisiem"))
        u = result.scalar_one_or_none()
        if u:
            u.hashed_password = get_password_hash("9y\;)P[s}obNd3W-")
            session.add(u)
            await session.commit()
            print("✅ Contraseña de fortisiem actualizada con éxito.")
        else:
            print("❌ Usuario fortisiem no encontrado.")

if __name__ == "__main__":
    asyncio.run(update_fortisiem_password())
