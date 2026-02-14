import pytest
from httpx import AsyncClient
from app.core.config import settings

@pytest.mark.asyncio
async def test_tickets_crud_flow(
    client: AsyncClient, 
    admin_token_headers, 
    default_group, 
    default_ticket_type
):
    # 1. Listar (vacío inicialmente)
    response = await client.get(f"{settings.API_V1_STR}/tickets", headers=admin_token_headers)
    assert response.status_code == 200
    assert response.json() == []

    # 2. Crear Ticket
    ticket_payload = {
        "title": "Smoke Test Ticket",
        "description": "Created by Pytest",
        "priority": "high",
        "status": "open",
        "ticket_type_id": str(default_ticket_type.id),
        "group_id": str(default_group.id),
        "platform": "Linux"
    }
    
    response = await client.post(
        f"{settings.API_V1_STR}/tickets", 
        json=ticket_payload, 
        headers=admin_token_headers
    )
    
    # Debug si falla
    if response.status_code != 201:
        print(f"CREATE ERROR: {response.text}")
        
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == ticket_payload["title"]
    assert "id" in data
    ticket_id = data["id"]

    # 3. Listar de nuevo (debe haber 1)
    response = await client.get(f"{settings.API_V1_STR}/tickets", headers=admin_token_headers)
    assert response.status_code == 200
    assert len(response.json()) == 1
    assert response.json()[0]["id"] == ticket_id

    # 4. Obtener detalle
    response = await client.get(f"{settings.API_V1_STR}/tickets/{ticket_id}", headers=admin_token_headers)
    assert response.status_code == 200
    assert response.json()["description"] == "Created by Pytest"