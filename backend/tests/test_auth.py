import pytest
from httpx import AsyncClient
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import User
from app.crud.crud_user import user as crud_user
from app.core.security import get_password_hash, generate_totp_secret
from app.schemas.user import UserCreate # Import UserCreate

# Fixture to create a test user (without 2FA for initial tests)
@pytest.fixture
async def test_user_no_2fa(test_db: AsyncSession) -> AsyncGenerator[User, None]:
    password = "testpass" # Changed password
    user_data = UserCreate( # Use UserCreate Pydantic model
        username="testuser",
        email="test@example.com",
        password=password,
        first_name="Test",
        last_name="User",
        group_id=None, # Will be set by crud_user.create
    )
    user = await crud_user.create(test_db, user_data)
    # Refresh to ensure relationships are loaded for further use
    await test_db.refresh(user)
    yield user
    await test_db.delete(user)
    await test_db.commit()

# Fixture to create a test user with 2FA enabled
@pytest.fixture
async def test_user_with_2fa(test_db: AsyncSession) -> AsyncGenerator[User, None]:
    password = "testpass" # Changed password
    user_data = UserCreate( # Use UserCreate Pydantic model
        username="2fatestuser",
        email="2fa@example.com",
        password=password,
        first_name="2FA",
        last_name="User",
        is_2fa_enabled=False, # This will be set by the test fixture, UserCreate doesn't have it
        totp_secret=None, # This will be set by the test fixture
        group_id=None, # Will be set by crud_user.create
    )
    user = await crud_user.create(test_db, user_data)
    # Manually set 2FA fields as create doesn't take them directly via UserCreate yet (only password is hashed)
    user.is_2fa_enabled = True
    user.totp_secret = generate_totp_secret()
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    yield user
    await test_db.delete(user)
    await test_db.commit()


@pytest.mark.anyio
async def test_login_success_no_2fa(client: AsyncClient, test_user_no_2fa: User):
    response = await client.post(
        "/api/v1/auth/login",
        json={"identifier": test_user_no_2fa.username, "password": "testpass"}, # Changed password
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data 
    assert "token_type" in data
    assert data["token_type"] == "bearer"

@pytest.mark.anyio
async def test_login_success_needs_2fa(client: AsyncClient, test_user_with_2fa: User):
    response = await client.post(
        "/api/v1/auth/login",
        json={"identifier": test_user_with_2fa.username, "password": "testpass"}, # Changed password
    )
    assert response.status_code == 200
    data = response.json()
    assert "interim_token" in data
    assert data["needs_2fa"] is True

@pytest.mark.anyio
async def test_login_invalid_credentials(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/login",
        json={"identifier": "nonexistent", "password": "wrongpassword"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect username or password"

@pytest.mark.anyio
async def test_login_2fa_success(client: AsyncClient, test_user_with_2fa: User):
    # First login to get interim token
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"identifier": test_user_with_2fa.username, "password": "testpass"}, # Changed password
    )
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert login_data["needs_2fa"] is True
    interim_token = login_data["interim_token"]

    # Generate a valid TOTP code
    import pyotp
    totp = pyotp.TOTP(test_user_with_2fa.totp_secret)
    valid_totp_code = totp.now()

    # Verify 2FA
    response = await client.post(
        "/api/v1/auth/login/2fa",
        headers={"Authorization": f"Bearer {interim_token}"},
        json={"totp_code": valid_totp_code},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "token_type" in data
    assert data["token_type"] == "bearer"

@pytest.mark.anyio
async def test_login_2fa_invalid_code(client: AsyncClient, test_user_with_2fa: User):
    # First login to get interim token
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"identifier": test_user_with_2fa.username, "password": "testpass"}, # Changed password
    )
    assert login_response.status_code == 200
    login_data = login_response.json()
    assert login_data["needs_2fa"] is True
    interim_token = login_data["interim_token"]

    # Try with an invalid TOTP code
    response = await client.post(
        "/api/v1/auth/login/2fa",
        headers={"Authorization": f"Bearer {interim_token}"},
        json={"totp_code": "000000"}, # Invalid code
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid 2FA code"

@pytest.mark.anyio
async def test_login_2fa_no_interim_token(client: AsyncClient):
    response = await client.post(
        "/api/v1/auth/login/2fa",
        json={"totp_code": "123456"},
    )
    assert response.status_code == 401 # Should fail without token

@pytest.mark.anyio
async def test_login_2fa_invalid_interim_token_scope(client: AsyncClient, test_user_no_2fa: User):
    # Simulate getting a session token directly (no 2FA needed)
    response_no_2fa = await client.post(
        "/api/v1/auth/login",
        json={"identifier": test_user_no_2fa.username, "password": "testpass"}, # Changed password
    )
    assert response_no_2fa.status_code == 200
    # For no-2fa user, the token is directly the interim_token in the LoginResponse
    full_token = response_no_2fa.json()["access_token"] 

    # Try to use this full token (which has 'session' scope) for 2FA verification
    response = await client.post(
        "/api/v1/auth/login/2fa",
        headers={"Authorization": f"Bearer {full_token}"},
        json={"totp_code": "123456"},
    )
    assert response.status_code == 401 # Should fail due to incorrect scope
    assert response.json()["detail"] == "Not enough permissions"