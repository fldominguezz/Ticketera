import pytest
from app.db.models.user import User
from app.db.models.iam import Role
from bootstrap_iam import bootstrap
from sqlalchemy.future import select

@pytest.mark.asyncio
async def test_bootstrap_idempotency(db_session):
    # 1. Ejecutar bootstrap por primera vez
    # Nota: bootstrap_iam.py usa su propia sesión, necesitamos que use la nuestra
    # Para el test, simularemos la lógica o llamaremos a la función
    await bootstrap() # Esto fallará si bootstrap no acepta inyección de DB, pero lo adaptaremos
    
    # 2. Verificar que se creó el admin
    res = await db_session.execute(select(User).where(User.username == "admin"))
    admin = res.scalar_one_or_none()
    assert admin is not None
    assert admin.email == "admin@example.com"
    
    # 3. Ejecutar de nuevo
    await bootstrap()
    
    # 4. Verificar que no hay duplicados
    res_all = await db_session.execute(select(User).where(User.username == "admin"))
    users = res_all.scalars().all()
    assert len(users) == 1
