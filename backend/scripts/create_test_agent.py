import asyncio
from app.db.session import AsyncSessionLocal
from app.crud.crud_user import user
from app.schemas.user import UserCreate
from uuid import UUID

async def create_test_user():
    async with AsyncSessionLocal() as db:
        user_in = UserCreate(
            username="agente_test",
            email="agente_test@example.com",
            password="AgentePassword123!",
            first_name="Agente",
            last_name="De Prueba",
            group_id=UUID("5c8abb4c-88c0-447c-90af-bec05132ffd7"),
            role_ids=[UUID("a69a8549-620f-4365-9fcd-3f15c4869daf")],
            is_active=True,
            is_superuser=False
        )
        try:
            db_user = await user.create(db, obj_in=user_in)
            # Desactivar flags de seguridad para el test rápido
            db_user.force_password_change = False
            db_user.enroll_2fa_mandatory = False
            await db.commit()
            print(f"USUARIO CREADO: {db_user.username}")
        except Exception as e:
            print(f"ERROR: {e}")

if __name__ == "__main__":
    asyncio.run(create_test_user())
