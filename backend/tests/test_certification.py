import pytest
from httpx import AsyncClient
from app.core.config import settings
import uuid

@pytest.mark.asyncio
async def test_workflow_transitions(client: AsyncClient, admin_token_headers, default_group, default_ticket_type):
    # 1. Crear ticket
    ticket_data = {
        "title": "Workflow Test",
        "description": "Testing status changes",
        "priority": "medium",
        "status": "new",
        "ticket_type_id": str(default_ticket_type.id),
        "group_id": str(default_group.id)
    }
    create_res = await client.post(f"{settings.API_V1_STR}/tickets", json=ticket_data, headers=admin_token_headers)
    assert create_res.status_code == 201
    ticket_id = create_res.json()["id"]

    # 2. Cambiar a 'in_progress' (Usando PUT)
    update_res = await client.put(f"{settings.API_V1_STR}/tickets/{ticket_id}", json={"status": "in_progress"}, headers=admin_token_headers)
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "in_progress"

    # 3. Cambiar a 'closed' (Usando PUT)
    close_res = await client.put(f"{settings.API_V1_STR}/tickets/{ticket_id}", json={"status": "closed"}, headers=admin_token_headers)
    assert close_res.status_code == 200
    assert close_res.json()["status"] == "closed"

@pytest.mark.asyncio
async def test_associations_ticket_asset(client: AsyncClient, admin_token_headers, default_group, default_ticket_type, default_asset):
    # 1. Crear ticket asociado a un asset
    ticket_data = {
        "title": "Ticket with Asset",
        "status": "new",
        "ticket_type_id": str(default_ticket_type.id),
        "group_id": str(default_group.id),
        "asset_id": str(default_asset.id)
    }
    res = await client.post(f"{settings.API_V1_STR}/tickets", json=ticket_data, headers=admin_token_headers)
    assert res.status_code == 201
    
    # 2. Verificar detalle del ticket incluye el asset
    ticket_id = res.json()["id"]
    detail_res = await client.get(f"{settings.API_V1_STR}/tickets/{ticket_id}", headers=admin_token_headers)
    assert detail_res.status_code == 200
    assert detail_res.json()["asset_id"] == str(default_asset.id)

@pytest.mark.asyncio
async def test_rbac_protection(client: AsyncClient, normal_user):
    # 1. Obtener token de usuario normal
    login_data = {"identifier": normal_user.email, "password": "testpass123"}
    login_res = await client.post(f"{settings.API_V1_STR}/auth/login", json=login_data)
    token = login_res.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {token}"}

    # 2. Intentar acceder a endpoint de auditoría (sin permiso audit.read)
    audit_res = await client.get(f"{settings.API_V1_STR}/audit", headers=user_headers)
    assert audit_res.status_code == 403

@pytest.mark.asyncio
async def test_soc_alerts_endpoint(client: AsyncClient, admin_token_headers):
    # Verificar que el monitor SIEM responde
    res = await client.get(f"{settings.API_V1_STR}/integrations/siem/alerts", headers=admin_token_headers)
    # Puede ser 404 si no hay integraciones configuradas, pero no 500
    assert res.status_code != 500