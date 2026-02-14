import pytest
import pytest_asyncio
from typing import AsyncGenerator, Generator
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import asyncio

from app.main import app
from app.core.config import settings
from app.db.base import Base
from app.api.deps import get_db

# Override DATABASE_URL for tests
# Asumiendo user:password del .env (user/password) y db host 'db'
TEST_DATABASE_URL = "postgresql+asyncpg://user:password@db:5432/ticketera_test"

engine_test = create_async_engine(TEST_DATABASE_URL, poolclass=NullPool)
TestingSessionLocal = sessionmaker(
    autocommit=False, 
    autoflush=False, 
    bind=engine_test, 
    class_=AsyncSession,
    expire_on_commit=False
)

# Eliminamos event_loop custom para dejar que pytest-asyncio maneje el default
# O lo alineamos a function scope si es necesario.
# En versiones nuevas, pytest-asyncio maneja esto.

@pytest_asyncio.fixture(scope="function", autouse=True)
async def prepare_database():
    # Create tables
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Drop tables
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture(scope="function")
async def db() -> AsyncGenerator[AsyncSession, None]:
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()

@pytest_asyncio.fixture(scope="function")
async def client(db) -> AsyncGenerator[AsyncClient, None]:
    app.dependency_overrides[get_db] = lambda: db
    # Override app state engine to avoid prod connection
    app.state.db_engine = engine_test
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

from app.core.security import get_password_hash
from app.db.models.user import User
from app.core.config import settings

@pytest_asyncio.fixture(scope="function")
async def admin_user(db: AsyncSession, default_group):
    # Crear usuario admin en test DB
    user = User(
        email="admin_test@example.com",
        username="admin_test",
        hashed_password=get_password_hash("testpass123"),
        is_active=True,
        is_superuser=True,
        first_name="Admin",
        last_name="Test",
        group_id=default_group.id
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@pytest_asyncio.fixture(scope="function")
async def normal_user(db: AsyncSession, default_group):
    user = User(
        email="user_test@example.com",
        username="user_test",
        hashed_password=get_password_hash("testpass123"),
        is_active=True,
        is_superuser=False,
        first_name="Normal",
        last_name="User",
        group_id=default_group.id
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@pytest_asyncio.fixture(scope="function")
async def admin_token_headers(client: AsyncClient, admin_user):
    login_data = {
        "identifier": admin_user.email,
        "password": "testpass123"
    }
    r = await client.post(f"{settings.API_V1_STR}/auth/login", json=login_data)
    tokens = r.json()
    a_token = tokens["access_token"]
    return {"Authorization": f"Bearer {a_token}"}

from app.db.models.group import Group
from app.db.models.ticket import TicketType
import uuid

@pytest_asyncio.fixture(scope="function")
async def default_group(db: AsyncSession):
    group = Group(
        id=uuid.uuid4(),
        name="Test Group",
        description="Group for testing"
    )
    db.add(group)
    await db.commit()
    return group

@pytest_asyncio.fixture(scope="function")
async def default_ticket_type(db: AsyncSession):
    tt = TicketType(
        id=uuid.uuid4(),
        name="Incident Test",
        description="Test Type",
        color="red",
        has_severity=True,
        requires_sla=False
    )
    db.add(tt)
    await db.commit()
    return tt

from app.db.models.asset import Asset

@pytest_asyncio.fixture(scope="function")
async def default_asset(db: AsyncSession):
    asset = Asset(
        id=uuid.uuid4(),
        hostname="TEST-SRV-01",
        ip_address="192.168.1.100",
        mac_address="AA:BB:CC:DD:EE:FF",
        status="operative",
        criticality="high"
    )
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return asset
