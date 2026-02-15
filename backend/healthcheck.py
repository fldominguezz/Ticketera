import urllib.request
import sys
import time

def check_health():
    try:
        # Usamos la ruta completa del API
        url = 'http://127.0.0.1:8000/api/v1/health'
        with urllib.request.urlopen(url, timeout=5) as response:
            if response.getcode() == 200:
                return True
    except Exception:
        return False
    return False

# Reintentos internos
for i in range(5):
    if check_health():
        sys.exit(0)
    time.sleep(2)

sys.exit(1)
