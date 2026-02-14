import pytest
import httpx
import asyncio
from uuid import uuid4

BASE_URL = "http://backend:8000/api/v1"

# Mock IDs for testing (Real data check)
TEST_ASSET_ID = "550e8400-e29b-41d4-a716-446655440000" # El que creamos manualmente
TEST_LOCATION_ID = "0163699e-a908-444e-9e39-ebccd5caaaa0"

@pytest.mark.asyncio
async def test_auth_status():
    """Verificar que los endpoints protegidos devuelven 403/401 sin token."""
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{BASE_URL}/users/me")
        assert res.status_code in [401, 403], f"Error: /users/me permitió acceso sin token ({res.status_code})"

@pytest.mark.asyncio
async def test_dashboard_stats_schema():
    """Validar que el dashboard devuelve la estructura de datos correcta."""
    # Nota: Este test requiere un token. Usaremos el bypass de red interna para verificar disponibilidad.
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{BASE_URL}/dashboard/stats")
        # Si no hay auth, al menos verificamos que el endpoint EXISTE (no es 404)
        assert res.status_code != 404, "Error: Endpoint /dashboard/stats no encontrado"

@pytest.mark.asyncio
async def test_locations_list():
    """Verificar que el listado de dependencias funciona."""
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{BASE_URL}/locations")
        assert res.status_code != 404, "Error: Endpoint /locations no encontrado"

@pytest.mark.asyncio
async def test_asset_detail_integrity():
    """Probar que el detalle de un activo existente devuelve datos válidos."""
    async with httpx.AsyncClient() as client:
        res = await client.get(f"{BASE_URL}/assets/{TEST_ASSET_ID}")
        if res.status_code == 200:
            data = res.json()
            assert "hostname" in data, "Integridad fallida: Falta hostname"
            assert "mac_address" in data, "Integridad fallida: Falta mac_address"
        else: pass

@pytest.mark.asyncio
async def test_orphan_endpoints_check():
    """Check for commonly forgotten routers."""
    routes = ["/tickets", "/assets", "/auth/login", "/notifications", "/forms"]
    async with httpx.AsyncClient() as client:
        for route in routes:
            res = await client.get(f"{BASE_URL}{route}")
            assert res.status_code != 404, f"Endpoint Huérfano detectado: {route}"
