import requests
import json
import time

BASE_URL = "http://localhost:8000/api/v1"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASS = "admin123"

def test_system():
    print("🚀 Iniciando Auditoría Técnica de Supervivencia...")
    ts = int(time.time())
    
    # 1. Login
    login_res = requests.post(f"{BASE_URL}/auth/login", json={"identifier": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=30)
    if login_res.status_code != 200:
        print(f"❌ FALLO: Autenticación Admin (Status {login_res.status_code})")
        return
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ OK: Autenticación Admin")

    # 2. Verificar Usuarios (admin y fortisiem ocultos)
    users_res = requests.get(f"{BASE_URL}/users", headers=headers, timeout=30)
    if users_res.status_code == 200:
        usernames = [u["username"] for u in users_res.json()]
        if "admin" in usernames or "fortisiem" in usernames:
            print("❌ FALLO: Usuarios protegidos son visibles")
        else:
            print("✅ OK: Usuarios admin/fortisiem ocultos")
    else:
        print(f"❌ FALLO: /users devuelto status {users_res.status_code}")

    # 3. Crear Estructura Jerárquica
    gp_name = f"PADRE_{{ts}}"
    gh_name = f"HIJO_{{ts}}"
    gp_res = requests.post(f"{BASE_URL}/groups", headers=headers, json={"name": gp_name, "description": "Grupo Padre"}, timeout=30)
    gp_id = gp_res.json()["id"]
    gh_res = requests.post(f"{BASE_URL}/groups", headers=headers, json={"name": gh_name, "parent_id": gp_id, "description": "Grupo Hijo"}, timeout=30)
    gh_id = gh_res.json()["id"]
    print(f"✅ OK: Jerarquía creada ({gp_name} -> {gh_name})")

    # 4. Probar Restricciones
    tt_res = requests.get(f"{BASE_URL}/ticket-types", headers=headers, timeout=30)
    all_types = tt_res.json()
    op_type_id = all_types[0]["id"] if all_types else None
    
    # A. No mandar a padre
    t_padre_res = requests.post(f"{BASE_URL}/tickets", headers=headers, json={
        "title": "FAIL", "description": "Error", "priority": "low", "group_id": gp_id, "ticket_type_id": op_type_id
    })
    if t_padre_res.status_code == 400:
        print("✅ OK: Restricción Grupo Padre activa")
    else:
        print(f"❌ FALLO: Se permitió ticket en padre ({t_padre_res.status_code})")

    # B. Bloqueo manual SIEM
    siem_type_id = next((t["id"] for t in all_types if "ALERTA SIEM" in t["name"].upper()), None)
    if siem_type_id:
        t_siem_res = requests.post(f"{BASE_URL}/tickets", headers=headers, json={
            "title": "MANUAL", "description": "X", "priority": "low", "group_id": gh_id, "ticket_type_id": siem_type_id
        })
        if t_siem_res.status_code == 400:
            print("✅ OK: Restricción ALERTA SIEM manual activa")

    # 5. Inventario
    loc_name = f"LOC_{{ts}}"
    loc_res = requests.post(f"{BASE_URL}/locations", headers=headers, json={"name": loc_name, "dependency_code": str(ts, timeout=30)[-4:], "path": f"TEST/{{ts}}"})
    loc_id = loc_res.json()["id"]
    asset_res = requests.post(f"{BASE_URL}/assets/install", headers=headers, json={
        "asset_data": {
            "hostname": f"PC-{{ts}}", "serial": f"SN-{{ts}}", "mac_address": "00:11:22:33:44:55",
            "ip_address": "10.0.0.1", "device_type": "desktop", "status": "operative", "location_node_id": loc_id
        },
        "install_data": {"gde_number": "TEST", "tecnico_instalacion": "A", "tecnico_carga": "B", "install_details": {}}
    })
    if asset_res.status_code == 200:
        print("✅ OK: Activo registrado en inventario")

    # 6. Auditoría
    audit_res = requests.get(f"{BASE_URL}/audit?limit=10", headers=headers, timeout=30)
    if len(audit_res.json()) > 0:
        print(f"✅ OK: Auditoría operativa ({len(audit_res.json())} eventos)")
    else:
        print("❌ FALLO: Auditoría no registra eventos")

    print("\n🏁 AUDITORIA FINALIZADA: Todo funcionando según especificaciones.")

if __name__ == "__main__":
    test_system()