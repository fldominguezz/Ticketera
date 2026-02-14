import asyncio
import os
import sys

# Añadir el path para importar app
sys.path.append(os.path.join(os.getcwd(), "Ticketera/backend"))

from sqlalchemy.future import select
from sqlalchemy import update
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.core.security import get_password_hash

async def mass_update_users():
    new_password = "Seguridad1601#"
    hashed_password = get_password_hash(new_password)
    excluded_users = ["admin", "fortisiem"]

    async with AsyncSessionLocal() as db:
        try:
            # Seleccionar usuarios para reporte
            result = await db.execute(
                select(User.username).filter(~User.username.in_(excluded_users))
            )
            users_to_update = result.scalars().all()
            
            if not users_to_update:
                print("No hay usuarios para actualizar.")
                return

            print(f"Actualizando {len(users_to_update)} usuarios: {', '.join(users_to_update)}")

            # Realizar actualización masiva
            q = update(User).where(
                ~User.username.in_(excluded_users)
            ).values(
                hashed_password=hashed_password,
                force_password_change=True,
                enroll_2fa_mandatory=True,
                reset_2fa_next_login=True,
                is_2fa_enabled=False, # Resetear estado actual para forzar nuevo registro
                totp_secret=None      # Limpiar secreto anterior
            )
            
            await db.execute(q)
            await db.commit()
            print("✅ Actualización completada con éxito.")
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Error durante la actualización: {e}")

if __name__ == "__main__":
    asyncio.run(mass_update_users())
