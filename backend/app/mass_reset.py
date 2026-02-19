import asyncio
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.db.models.user import User
from app.core.security import get_password_hash

async def reset_passwords():
    print("Iniciando reseteo masivo de contraseñas...")
    new_password = "Seguridad1601#"
    hashed_password = get_password_hash(new_password)
    excluded_users = ["admin", "fortisiem"]
    
    async with AsyncSessionLocal() as session:
        # Obtener todos los usuarios
        result = await session.execute(select(User))
        users = result.scalars().all()
        
        updated_count = 0
        for user in users:
            if user.username not in excluded_users:
                user.hashed_password = hashed_password
                # Opcional: Si tienes un campo force_password_change, podrías ponerlo en False
                # si quieres que entren directo o en True si quieres que la cambien.
                if hasattr(user, 'force_password_change'):
                    user.force_password_change = False
                
                updated_count += 1
                print(f"Contraseña actualizada para: {user.username}")
        
        await session.commit()
        print(f"Proceso finalizado. Se actualizaron {updated_count} usuarios.")

if __name__ == "__main__":
    asyncio.run(reset_passwords())
