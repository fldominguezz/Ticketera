import pytest
from httpx import AsyncClient
from bootstrap_iam import bootstrap

@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    # Inicializar datos base
    await bootstrap()
    
    # Intentar Login
    response = await client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin", "password": "admin123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_login_invalid_password(client: AsyncClient):
    await bootstrap()
    response = await client.post(
        "/api/v1/auth/login",
        json={"identifier": "admin", "password": "wrongpassword"}
    )
    assert response.status_code == 401