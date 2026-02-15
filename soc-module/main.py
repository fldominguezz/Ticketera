import socket
import requests
import os
import time
import sys
from datetime import datetime
from requests.auth import HTTPBasicAuth

# Config
UDP_IP = "0.0.0.0"
UDP_PORT = 514
BACKEND_URL = os.getenv("BACKEND_URL", "http://backend:8000/api/v1/integrations/fortisiem-incident")

# Credenciales SIEM
SIEM_USER = os.getenv("SIEM_USER", "fortisiem@example.com")
SIEM_PASS = os.getenv("SIEM_API_PASSWORD", "b19876e0b0caf3ce6095e57a7c3e3249")

def forward_to_backend(data, addr):
    try:
        print(f"[{datetime.now()}] Recibido evento de {addr[0]} ({len(data)} bytes)")
        
        headers = {"Content-Type": "application/xml"}
        
        # Enviar con Basic Auth
        response = requests.post(
            BACKEND_URL, 
            data=data, 
            headers=headers, 
            auth=HTTPBasicAuth(SIEM_USER, SIEM_PASS),
            timeout=30
        )
        
        if response.status_code == 200:
            print(f" -> OK: Evento procesado (200)")
        else:
            print(f" -> ERROR: Backend {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f" -> EXCEPCIÓN: Fallo de conexión: {e}")

def start_server():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.bind((UDP_IP, UDP_PORT))
    print(f"--- SOC MODULE REINICIADO ---")
    print(f"Escuchando UDP: {UDP_PORT}")
    print(f"Destino Backend: {BACKEND_URL}")
    print(f"Usuario Auth: {SIEM_USER}")

    while True:
        try:
            data, addr = sock.recvfrom(65535) # Buffer size
            forward_to_backend(data, addr)
        except Exception as e:
            print(f"Error crítico en loop UDP: {e}")

if __name__ == "__main__":
    start_server()
