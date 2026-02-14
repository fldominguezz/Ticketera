import asyncio
import os
import uuid
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from argon2 import PasswordHasher

# Configuración
EMAIL = "jzarate@policiafederal.gov.ar"
PASSWORD = "Seguridad1601#"
WORKSPACE_ID = "019c3e5c-6134-744e-9472-b39aea92e140"

async def sync():
    # URL de la base de datos de Docmost
    db_url = "postgresql+asyncpg://user:password@db:5432/docmost_db"
    engine = create_async_engine(db_url)
    
    # Generar Hash Argon2 (Docmost compatible)
    ph = PasswordHasher()
    hashed = ph.hash(PASSWORD)
    
    async with engine.begin() as conn:
        # Verificar si existe
        res = await conn.execute(text("SELECT id FROM users WHERE email = :email"), {"email": EMAIL})
        user_id = res.scalar()
        
        if not user_id:
            user_id = uuid.uuid4()
            await conn.execute(text("""
                INSERT INTO users (id, name, email, email_verified_at, workspace_id, role, password, created_at, updated_at)
                VALUES (:id, :name, :email, now(), :workspace_id, 'user', :password, now(), now())
            """), {
                "id": user_id,
                "name": "J Zarate",
                "email": EMAIL,
                "workspace_id": WORKSPACE_ID,
                "password": hashed
            })
            print(f"Usuario {EMAIL} creado en Docmost.")
        else:
            await conn.execute(text("""
                UPDATE users SET password = :password, updated_at = now() 
                WHERE id = :id
            """), {
                "id": user_id,
                "password": hashed
            })
            print(f"Contraseña de {EMAIL} actualizada en Docmost.")

    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(sync())
