import asyncio
from sqlalchemy import text
from app.db.session import AsyncSessionLocal
from app.core.security import get_password_hash

async def recover_admin():
    async with AsyncSessionLocal() as session:
        # 1. Buscar al usuario 'admin'
        res = await session.execute(text("SELECT id, email, username FROM users WHERE username = 'admin'"))
        user = res.fetchone()
        
        if user:
            print(f"✅ Usuario encontrado: Username='{user.username}', Email='{user.email}'")
            
            # 2. Generar nuevo hash para 'adminpassword'
            new_password_hash = get_password_hash("adminpassword")
            
            # 3. Actualizar la contraseña directamente en la DB
            await session.execute(
                text("UPDATE users SET hashed_password = :pwd WHERE id = :uid"),
                {"pwd": new_password_hash, "uid": user.id}
            )
            await session.commit()
            print("🔓 Contraseña restablecida exitosamente a: adminpassword")
        else:
            print("❌ No se encontró ningún usuario con username 'admin'.")

if __name__ == "__main__":
    asyncio.run(recover_admin())
