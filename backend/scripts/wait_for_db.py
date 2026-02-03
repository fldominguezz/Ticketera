import socket
import time
import os
import sys

host = os.getenv("POSTGRES_HOST", "db")
port = int(os.getenv("POSTGRES_PORT", "5432"))
max_retries = 30
wait_seconds = 2

print(f"Waiting for database at {host}:{port}...")

for i in range(max_retries):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex((host, port))
        sock.close()
        
        if result == 0:
            print("Database is up and accepting connections!")
            sys.exit(0)
    except Exception as e:
        print(f"Connection error: {e}")
        
    print(f"Database unavailable, retrying in {wait_seconds}s... ({i+1}/{max_retries})")
    time.sleep(wait_seconds)

print("Could not connect to database after multiple retries.")
sys.exit(1)
