#!/bin/bash
set -e

# Wait for database
echo "Waiting for database..."
until python3 -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); s.connect(('db', 5432))" 2>/dev/null; do
  echo "Database is unavailable - sleeping"
  sleep 1
done
echo "Database is up!"

# Run alembic migrations
PYTHONPATH=/app alembic upgrade head

# Start the application
exec "$@"
