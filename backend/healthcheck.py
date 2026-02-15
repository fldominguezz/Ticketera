import urllib.request
import sys

def check_health():
    url = 'http://localhost:8000/api/v1/health'
    try:
        with urllib.request.urlopen(url, timeout=5) as response:
            if response.getcode() == 200:
                return True
            else:
                print(f"Health check failed with status code: {response.getcode()}", file=sys.stderr)
    except Exception as e:
        print(f"Health check exception: {e}", file=sys.stderr)
    return False

if check_health():
    sys.exit(0)
else:
    sys.exit(1)
