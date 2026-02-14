import socket
import sys
import time

def check_port(host, port):
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(1)
        s.connect((host, port))
        s.close()
        return True
    except Exception:
        return False

# Reintentos internos para absorber el delay de inicio de FastAPI
for _ in range(3):
    if check_port('127.0.0.1', 8000):
        sys.exit(0)
    time.sleep(2)

sys.exit(1)
