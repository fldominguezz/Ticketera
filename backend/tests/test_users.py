import pytest
from httpx import AsyncClient
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import User
from app.crud.crud_user import user as crud_user
from app.crud.crud_iam import iam as crud_iam
from app.core.security import get_password_hash, generate_totp_secret, verify_totp
from app.schemas.user import UserCreate # Import UserCreate

# Fixture to create a test superuser
@pytest.fixture
async def test_superuser(test_db: AsyncSession) -> AsyncGenerator[User, None]:
    password = "testpass" # Changed password
    user_data = UserCreate( # Use UserCreate Pydantic model
        username="superuser",
        email="superuser@example.com",
        password=password,
        first_name="Super",
        last_name="User",
        is_superuser=True,
        group_id=None, # Will be set by crud_user.create
    )
    user = await crud_user.create(test_db, user_data)
    await test_db.refresh(user)
    yield user
    await test_db.delete(user)
    await test_db.commit()

@pytest.fixture
async def authenticated_superuser_client(client: AsyncClient, test_superuser: User) -> AsyncGenerator[AsyncClient, None]:
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"identifier": test_superuser.username, "password": "testpass"}, # Changed password
    )
    assert login_response.status_code == 200
    token_data = login_response.json()
    access_token = token_data["access_token"] 

    client.headers["Authorization"] = f"Bearer {access_token}"
    yield client
    client.headers.pop("Authorization")

@pytest.fixture
async def test_normal_user(test_db: AsyncSession) -> AsyncGenerator[User, None]:
    password = "testpass" # Changed password
    user_data = UserCreate( # Use UserCreate Pydantic model
        username="normaluser",
        email="normal@example.com",
        password=password,
        first_name="Normal",
        last_name="User",
        is_superuser=False,
        group_id=None, # Will be set by crud_user.create
    )
    user = await crud_user.create(test_db, user_data)
    await test_db.refresh(user)
    yield user
    await test_db.delete(user)
    await test_db.commit()

@pytest.fixture
async def authenticated_normal_user_client(client: AsyncClient, test_normal_user: User) -> AsyncGenerator[AsyncClient, None]:
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"identifier": test_normal_user.username, "password": "testpass"}, # Changed password
    )
    assert login_response.status_code == 200
    token_data = login_response.json()
    access_token = token_data["access_token"]

    client.headers["Authorization"] = f"Bearer {access_token}"
    yield client
    client.headers.pop("Authorization")


@pytest.mark.anyio
async def test_change_password_success(authenticated_normal_user_client: AsyncClient, test_normal_user: User):
    response = await authenticated_normal_user_client.post(
        "/api/v1/users/me/change-password",
        json={"current_password": "testpass", "new_password": "newsecurepassword123"}, # Changed password
    )
    assert response.status_code == 200
    assert response.json()["message"] == "Password updated successfully"

    # Verify new password works
    login_response = await authenticated_normal_user_client.post(
        "/api/v1/auth/login",
        json={"identifier": test_normal_user.username, "password": "newsecurepassword123"},
    )
    assert login_response.status_code == 200

@pytest.mark.anyio
async def test_change_password_incorrect_current_password(authenticated_normal_user_client: AsyncClient):
    response = await authenticated_normal_user_client.post(
        "/api/v1/users/me/change-password",
        json={"current_password": "wrongpassword", "new_password": "newsecurepassword123"},
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Incorrect current password"

@pytest.mark.anyio
async def test_2fa_setup_enable_disable_flow(authenticated_normal_user_client: AsyncClient, test_normal_user: User, test_db: AsyncSession):
    # 1. Setup 2FA
    response_setup = await authenticated_normal_user_client.post("/api/v1/users/me/2fa/setup")
    assert response_setup.status_code == 200
    setup_data = response_setup.json()
    assert "secret" in setup_data
    assert "provisioning_uri" in setup_data
    assert "recovery_codes" in setup_data
    
    # Reload user from DB to get the secret (access the real DB session from the app)
    user_in_db = await crud_user.get(test_db, test_normal_user.id)
    assert user_in_db.totp_secret is not None
    test_normal_user.totp_secret = user_in_db.totp_secret # Update fixture user with secret

    # 2. Enable 2FA with valid code
    import pyotp
    totp = pyotp.TOTP(test_normal_user.totp_secret)
    valid_totp_code = totp.now()

    response_enable = await authenticated_normal_user_client.post(
        "/api/v1/users/me/2fa/enable",
        json={"totp_code": valid_totp_code},
    )
    assert response_enable.status_code == 200
    assert response_enable.json()["message"] == "2FA enabled successfully."

    # 3. Try to login with 2FA enabled
    login_response_2fa = await authenticated_normal_user_client.post(
        "/api/v1/auth/login",
        json={"identifier": test_normal_user.username, "password": "testpass"}, # Changed password
    )
    assert login_response_2fa.status_code == 200
    assert login_response_2fa.json()["needs_2fa"] is True

    # 4. Disable 2FA
    response_disable = await authenticated_normal_user_client.post(
        "/api/v1/users/me/2fa/disable",
        json={"password": "testpass"}, # Changed password
    )
    assert response_disable.status_code == 200
    assert response_disable.json()["message"] == "2FA disabled successfully."

    # 5. Try to login after 2FA disabled - should not require 2FA
    # 5. Try to login after 2FA disabled - should not require 2FA
    login_response_no_2fa = await authenticated_normal_user_client.post(
        "/api/v1/auth/login",
        json={"identifier": test_normal_user.username, "password": "testpass"}, # Changed password
    )
    assert login_response_no_2fa.status_code == 200
    assert "access_token" in login_response_no_2fa.json() # Changed assertion
@pytest.mark.anyio
async def test_create_role_and_assign_to_user(authenticated_superuser_client: AsyncClient, test_normal_user: User):
    # 1. Create a role
    role_name = "test_role"
    create_role_response = await authenticated_superuser_client.post(
        "/api/v1/roles/", 
        json={"name": role_name, "description": "A test role"},
    )
    assert create_role_response.status_code == 201
    created_role = create_role_response.json()
    assert created_role["name"] == role_name

    # 2. Assign the role to a normal user
    assign_role_response = await authenticated_superuser_client.post(
        "/api/v1/users/roles/",
        json={"user_id": str(test_normal_user.id), "role_id": created_role["id"]},
    )
    assert assign_role_response.status_code == 201
    assigned_role_data = assign_role_response.json()
    assert assigned_role_data["user_id"] == str(test_normal_user.id)
    assert assigned_role_data["role_id"] == created_role["id"]

    # In a real test, you'd then try to query the user's roles
