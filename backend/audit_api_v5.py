import asyncio
import httpx

async def audit():
    async with httpx.AsyncClient(base_url="http://localhost:8000/api/v1") as client:
        print("🔐 Iniciando Sesión Final...")
        login_res = await client.post("/auth/login", json={"identifier": "admin", "password": "admin123"})
        if login_res.status_code != 200:
            print(f"❌ Fallo Login: {login_res.status_code}")
            return
        
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        endpoints = [
            "/dashboard/stats",
            "/tickets",
            "/admin/workflows/states",
            "/assets",
            "/expedientes",
            "/audit",
            "/groups",
            "/admin/settings"
        ]
        
        print("\n--- INFORME DE AUDITORÍA API FINAL ---")
        for ep in endpoints:
            res = await client.get(ep, headers=headers)
            status = "✅ PASS" if res.status_code == 200 else f"❌ FAIL ({res.status_code})"
            print(f"Endpoint {ep:35}: {status}")
            if res.status_code != 200:
                print(f"   Detail: {res.text}")

if __name__ == "__main__":
    asyncio.run(audit())
