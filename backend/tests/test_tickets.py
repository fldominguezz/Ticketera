import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import User, Ticket
from app.crud.crud_user import user as crud_user
from app.crud.crud_ticket import ticket as crud_ticket
from app.schemas.user import UserCreate
from app.schemas.ticket import TicketCreate
from uuid import UUID

@pytest.fixture
async def admin_user(test_db: AsyncSession) -> User:
    import uuid
    uid = str(uuid.uuid4())[:8]
    user_in = UserCreate(
        username=f"admin_{uid}",
        email=f"admin_{uid}@example.com",
        password="adminpass",
        first_name="Admin",
        last_name="Test",
    )
    user = await crud_user.create(test_db, user_in)
    user.role = "owner" # Use owner for full permissions
    user.is_superuser = True
    user.force_password_change = False
    user.enroll_2fa_mandatory = False
    test_db.add(user)
    await test_db.commit()
    await test_db.refresh(user)
    return user

@pytest.fixture
async def ticket_deps(test_db: AsyncSession, admin_user: User):
    from app.db.models.ticket import TicketType
    from app.db.models.group import Group
    import uuid
    uid = str(uuid.uuid4())[:8]
    
    tt = TicketType(name=f"Type_{uid}", description="Test Type", icon="bug")
    test_db.add(tt)
    
    group = Group(name=f"Group_{uid}", description="Test Group")
    test_db.add(group)
    
    await test_db.commit()
    await test_db.refresh(tt)
    await test_db.refresh(group)
    
    return {"ticket_type_id": tt.id, "group_id": group.id}

@pytest.fixture
async def auth_headers(client: AsyncClient, admin_user: User):
    response = await client.post(
        "/api/v1/auth/login",
        json={"identifier": admin_user.username, "password": "adminpass"},
    )
    data = response.json()
    token = data.get("access_token")
    return {"Authorization": f"Bearer {token}"}

@pytest.mark.anyio
async def test_create_ticket(client: AsyncClient, auth_headers: dict, ticket_deps: dict):
    ticket_data = {
        "title": "Test Ticket",
        "description": "This is a test ticket",
        "priority": "medium",
        "severity": "low",
        "status": "new",
        "category": "incident",
        "ticket_type_id": str(ticket_deps["ticket_type_id"]),
        "group_id": str(ticket_deps["group_id"])
    }
    response = await client.post(
        "/api/v1/tickets",
        json=ticket_data,
        headers=auth_headers
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == ticket_data["title"]

@pytest.mark.anyio
async def test_read_tickets(client: AsyncClient, auth_headers: dict):
    response = await client.get("/api/v1/tickets", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.anyio
async def test_read_ticket_by_id(client: AsyncClient, auth_headers: dict, test_db: AsyncSession, admin_user: User, ticket_deps: dict):
    ticket_in = TicketCreate(
        title="Specific Ticket",
        description="Detail view test",
        priority="high",
        severity="critical",
        status="new",
        category="security",
        ticket_type_id=ticket_deps["ticket_type_id"],
        group_id=ticket_deps["group_id"]
    )
    ticket = await crud_ticket.create(test_db, obj_in=ticket_in, created_by_id=admin_user.id)
    
    response = await client.get(f"/api/v1/tickets/{ticket.id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["title"] == "Specific Ticket"

@pytest.mark.anyio
async def test_update_ticket(client: AsyncClient, auth_headers: dict, test_db: AsyncSession, admin_user: User, ticket_deps: dict):
    ticket_in = TicketCreate(
        title="Ticket to Update",
        description="Old description",
        priority="low",
        severity="low",
        status="new",
        category="request",
        ticket_type_id=ticket_deps["ticket_type_id"],
        group_id=ticket_deps["group_id"]
    )
    ticket = await crud_ticket.create(test_db, obj_in=ticket_in, created_by_id=admin_user.id)
    
    update_data = {"title": "Updated Title", "status": "open"}
    response = await client.put(
        f"/api/v1/tickets/{ticket.id}",
        json=update_data,
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Title"
