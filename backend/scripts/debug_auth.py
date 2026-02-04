import requests
import json
import jwt

BASE_URL = "http://localhost:8000/api/v1"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASS = "admin123"

def debug_auth():
    print("🔍 Depurando Autenticación...")
    res = requests.post(f"{BASE_URL}/auth/login", json={"identifier": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
    data = res.json()
    token = data.get("access_token")
    
    if not token:
        print("❌ No se recibió token:", data)
        return

    print("✅ Token recibido.")
    
    # Decodificar sin verificar firma para ver el contenido
    decoded = jwt.decode(token, options={"verify_signature": False})
    print("📝 Contenido del Token:", json.dumps(decoded, indent=2))
    
    # Probar peticion
    headers = {"Authorization": f"Bearer {token}"}
    res_me = requests.get(f"{BASE_URL}/users/me", headers=headers, timeout=30)
    print(f"📡 Test /users/me: Status {res_me.status_code}")
    if res_me.status_code != 200:
        print("❌ Error details:", res_me.text)

if __name__ == "__main__":
    debug_auth()
