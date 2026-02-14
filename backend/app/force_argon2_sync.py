import asyncio
import sys
import os
import asyncpg
from sqlalchemy import select

# Añadir el path para importar los módulos de la app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import AsyncSessionLocal
from app.db import models
from app.core.security import get_password_hash

async def sync_to_docmost(email, password_hash):
    try:
        # Conexión asíncrona a Docmost
        conn = await asyncpg.connect(
            user="user",
            password="password",
            database="docmost_db",
            host="db"
        )
        await conn.execute(
            "UPDATE users SET password = $1 WHERE email = $2",
            password_hash, email
        )
        await conn.close()
    except Exception:
        pass

async def force_sync():
    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(select(models.User))
            users = result.scalars().all()
            
            temp_pass = "SOC_Access_2026!"
            new_hash = get_password_hash(temp_pass)
            
            
            for user in users:
                user.hashed_password = new_hash
                await sync_to_docmost(user.email, new_hash)
            
            await db.commit()
            
        except Exception as e:
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(force_sync())