#!/bin/bash
set -e

echo "--- Pre-Validation: Waiting for Backend Connectivity ---"
MAX_RETRIES=60
RETRY_COUNT=0
BACKEND_HOST="backend"
BACKEND_PORT=8000

until (echo > /dev/tcp/$BACKEND_HOST/$BACKEND_PORT) >/dev/null 2>&1; do
    RETRY_COUNT=$((RETRY_COUNT+1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ CRITICAL: Backend ($BACKEND_HOST:$BACKEND_PORT) did not become available after 5 minutes."
        exit 1
    fi
    echo "Waiting for backend... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 5
done

echo "✅ Backend is reachable at $BACKEND_HOST:$BACKEND_PORT"

echo "Starting Total Validation Agent via Python orchestrator..."

# The Python script will now orchestrate all validation steps and generate the report
python3 /app/scripts/generate_report.py

echo "Total Validation Agent Finished."

