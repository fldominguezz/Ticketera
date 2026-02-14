import asyncio
from sqlalchemy.future import select
from app.db.session import AsyncSessionLocal
from app.db.models import User
from app.core.security import get_password_hash

async def set_final_admin_pass():
    new_password = "!zmXwu*gEg0@"
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).filter(User.username == "admin"))
        user = result.scalar_one_or_none()
        if user:
            user.hashed_password = get_password_hash(new_password)
            await session.commit()
            print(f"CONTRASENA_FINAL_ESTABLECIDA: {new_password}")
        else:
            print("ERROR: Usuario admin no encontrado.")

if __name__ == "__main__":
    asyncio.run(set_final_admin_pass())
