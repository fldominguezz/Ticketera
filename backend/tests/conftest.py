import pytest
from typing import Generator, Any, AsyncGenerator
from fastapi import FastAPI
# from fastapi.testclient import TestClient # Removed this import
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, AsyncEngine
from sqlalchemy.orm import sessionmaker
from sqlalchemy_utils import create_database, drop_database, database_exists
import asyncio
import os
from httpx import AsyncClient, ASGITransport # Explicitly import AsyncClient and ASGITransport

pytest_plugins = ["pytest_asyncio"]
pytest_asyncio_mode = "auto"

# Configuration for the test database
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "postgresql+asyncpg://user:password@db:5432/test_ticketera_db")

# Import your application's components
from app.db.base import Base
from app.main import app
from app.api.deps import get_db # Your dependency override

@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"

# Use a synchronous fixture for database creation/teardown
@pytest.fixture(scope="session", autouse=True)
def setup_test_database_sync() -> Generator[None, Any, None]:
    db_url = str(TEST_DATABASE_URL).replace("+asyncpg", "")
    if database_exists(db_url): # Check if already exists (e.g. from previous failed run)
        drop_database(db_url)
    create_database(db_url)
    yield
    drop_database(db_url)

@pytest.fixture(scope="session")
async def test_engine(setup_test_database_sync: None) -> AsyncEngine:
    engine = create_async_engine(TEST_DATABASE_URL, future=True, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all) # Create tables for models
    yield engine
    await engine.dispose()

@pytest.fixture(scope="function")
async def test_db(test_engine: AsyncEngine) -> AsyncGenerator[AsyncSession, None]:
    async_session = sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False, autocommit=False, autoflush=False
    )
    async with async_session() as session:
        # Begin a transaction
        await session.begin()
        yield session
        # Rollback the transaction to clean up any changes made during the test
        await session.rollback()

@pytest.fixture(scope="function")
async def client(test_db: AsyncSession) -> AsyncGenerator[AsyncClient, None]: # Changed return type to AsyncClient
    def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield test_db
    
    app.dependency_overrides[get_db] = override_get_db
    
    # Use httpx.AsyncClient with ASGITransport
    async_client = AsyncClient(base_url="http://test", transport=ASGITransport(app=app), follow_redirects=False)
    yield async_client
    await async_client.aclose() # Ensure the client is closed properly

    app.dependency_overrides.clear()