#!/bin/bash
set -e

# Run alembic migrations
PYTHONPATH=/app alembic upgrade head

# Start the application
exec "$@"
