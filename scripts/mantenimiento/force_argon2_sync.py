import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal

async def force_sync():
    # Nueva clave temporal para todos
    NEW_PASS = "SOC_Access_2026!"
    new_hash = get_password_hash(NEW_PASS)
    
    db_url_wiki = os.getenv("DATABASE_URL", "").replace("ticketera_db", "docmost_db")
    engine_wiki = create_async_engine(db_url_wiki)
    
    print(f"Generando nuevo hash Argon2id para todos los usuarios...")
    
    async with AsyncSessionLocal() as db:
        # 1. Obtener todos los emails de la Ticketera
        result = await db.execute(text("SELECT email FROM users"))
        users = result.all()
        
        # 2. Actualizar Ticketera
        await db.execute(
            text("UPDATE users SET hashed_password = :h, force_password_change = true"),
            {"h": new_hash}
        )
        await db.commit()
        print(f"✅ Ticketera: {len(users)} usuarios actualizados con password temporal.")

        # 3. Actualizar Wiki (Docmost)
        async with engine_wiki.begin() as conn:
            for (email,) in users:
                await conn.execute(
                    text("UPDATE users SET password = :h WHERE email = :email"),
                    {"h": new_hash, "email": email}
                )
        print(f"✅ Wiki: Sincronización de hashes completada.")

    await engine_wiki.dispose()
    print(f"
ATENCIÓN: La nueva contraseña para TODOS es: {NEW_PASS}")
    print("Se ha activado el cambio obligatorio de contraseña al entrar.")

if __name__ == "__main__":
    asyncio.run(force_sync())
