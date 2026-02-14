import pytest
from httpx import AsyncClient
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import User
from app.crud.crud_user import user as crud_user
from app.core.security import get_password_hash
from app.schemas.user import UserCreate # <--- Add this import

# Fixture to create a test user (without 2FA for initial tests)
@pytest.fixture
async def test_user_no_2fa(test_db: AsyncSession) -> AsyncGenerator[User, None]:
    password = "testpassword"
    # Create a UserCreate instance from the dictionary
    user_in = UserCreate(
        username="sessiontestuser",
        email="session@example.com",
        password=password,
        first_name="Session",
        last_name="User",
        group_id=None,
    )
    user = await crud_user.create(test_db, user_in)
    # Refresh to ensure relationships are loaded for further use
    await test_db.refresh(user)
    yield user
    await test_db.delete(user)
    await test_db.commit()

@pytest.fixture
async def authenticated_client(client: AsyncClient, test_user_no_2fa: User) -> AsyncGenerator[AsyncClient, None]:
    # Log in the user
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"identifier": test_user_no_2fa.username, "password": "testpassword"},
    )
    assert login_response.status_code == 200
    token_data = login_response.json()
    access_token = token_data["access_token"] # For no-2fa user, interim_token is the final token

    client.headers["Authorization"] = f"Bearer {access_token}"
    client.follow_redirects = False # Explicitly set to False
    yield client
    client.headers.pop("Authorization")
    client.follow_redirects = True # Reset for other tests if needed



@pytest.mark.anyio
async def test_get_my_sessions(authenticated_client: AsyncClient):
    response = await authenticated_client.get("/api/v1/sessions/me")
    assert response.status_code == 200
    data = response.json()
    assert "current_session" in data
    assert "other_sessions" in data
    assert data["current_session"]["is_active"] is True
    assert len(data["other_sessions"]) == 0

@pytest.mark.anyio
async def test_logout_my_session(authenticated_client: AsyncClient):
    response = await authenticated_client.post("/api/v1/sessions/me/logout")
    assert response.status_code == 200
    assert response.json()["detail"] == "Session logged out"

    # Try to access a protected endpoint with the logged out token - should fail
    response = await authenticated_client.get("/api/v1/users/me")
    assert response.status_code == 401

@pytest.mark.anyio
async def test_logout_others(client: AsyncClient, test_user_no_2fa: User):
    # Log in first session
    login_response_1 = await client.post(
        "/api/v1/auth/login",
        json={"identifier": test_user_no_2fa.username, "password": "testpassword"},
    )
    assert login_response_1.status_code == 200
    token_data_1 = login_response_1.json()
    access_token_1 = token_data_1["access_token"]

    # Log in second session
    login_response_2 = await client.post(
        "/api/v1/auth/login",
        json={"identifier": test_user_no_2fa.username, "password": "testpassword"},
    )
    assert login_response_2.status_code == 200
    token_data_2 = login_response_2.json()
    access_token_2 = token_data_2["access_token"]

    # Use client 1 to logout others
    client.headers["Authorization"] = f"Bearer {access_token_1}"
    response = await client.post("/api/v1/sessions/me/logout-others")
    assert response.status_code == 200
    assert response.json()["detail"] == "1 other sessions logged out."

    # Client 1 session should still be active
    response = await client.get("/api/v1/sessions/me")
    assert response.status_code == 200
    data = response.json()
    assert data["current_session"]["is_active"] is True
    assert len(data["other_sessions"]) == 0

    # Client 2 session should be inactive
    client.headers["Authorization"] = f"Bearer {access_token_2}"
    response = await client.get("/api/v1/sessions/me")
    assert response.status_code == 401 # Should be unauthorized