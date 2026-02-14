import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import User, Form
from app.crud.crud_user import user as crud_user
from app.schemas.user import UserCreate
from uuid import uuid4

@pytest.fixture
async def admin_user(test_db: AsyncSession) -> User:
    user_in = UserCreate(
        username="form_admin",
        email="form_admin@example.com",
        password="adminpass",
        first_name="Form",
        last_name="Admin",
    )
    user = await crud_user.create(test_db, user_in)
    user.role = "admin"
    # Note: In real app, permissions are handled by role and RBAC
    # We might need to mock require_permission if it checks something specific
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user

@pytest.fixture
async def auth_headers(client: AsyncClient, admin_user: User):
    response = await client.post(
        "/api/v1/auth/login",
        json={"identifier": "form_admin", "password": "adminpass"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.anyio
async def test_create_form_template(client: AsyncClient, auth_headers: dict):
    form_data = {
        "name": "Installation Form",
        "description": "Standard installation request",
        "fields": [
            {"name": "software_name", "type": "text", "label": "Software Name", "required": True},
            {"name": "version", "type": "text", "label": "Version", "required": False}
        ],
        "is_active": True
    }
    response = await client.post(
        "/api/v1/forms",
        json=form_data,
        headers=auth_headers
    )
    assert response.status_code == 200 # Based on read_file of forms.py
    data = response.json()
    assert data["name"] == form_data["name"]
    assert len(data["fields"]) == 2

@pytest.mark.anyio
async def test_get_forms(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/forms", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.anyio
async def test_submit_form(client: AsyncClient, auth_headers: dict, test_db: AsyncSession, admin_user: User):
    # Create form first
    from app.crud.crud_form import form as crud_form
    from app.schemas.form import FormCreate
    
    form_in = FormCreate(
        name="Submit Test",
        description="Test submission",
        fields=[{"name": "test_field", "type": "text", "label": "Test", "required": True}]
    )
    form_db = await crud_form.create(test_db, obj_in=form_in, created_by_id=admin_user.id)
    
    submission_data = {"test_field": "Sample Value"}
    response = await client.post(
        f"/api/v1/forms/{form_db.id}/submit",
        json=submission_data,
        headers=auth_headers
    )
    # The submit_form endpoint in forms.py (from read_file) likely does more than just save
    # It might create a ticket or similar.
    assert response.status_code in [200, 201]
