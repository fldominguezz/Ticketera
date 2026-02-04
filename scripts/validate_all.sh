#!/bin/bash
# set -e # Don't exit on error to allow log dumping

echo "--- Pre-Validation: Waiting for Backend Connectivity ---"
MAX_RETRIES=120
RETRY_COUNT=0
BACKEND_URL="http://backend:8000/healthz"

echo "Waiting for backend to be ready at $BACKEND_URL..."
sleep 5 # Initial grace period for networking

until curl -s --max-time 2 "$BACKEND_URL" > /dev/null; do
    RETRY_COUNT=$((RETRY_COUNT+1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ CRITICAL: Backend did not become available after 10 minutes."
        echo "--- Network Diagnostic ---"
        echo "1. Pinging backend host..."
        ping -c 3 backend || echo "Ping failed"
        echo "2. Detailed curl to healthz..."
        curl -v "$BACKEND_URL"
        echo "3. Testing raw TCP port 8000..."
        (echo > /dev/tcp/backend/8000) >/dev/null 2>&1 && echo "Port 8000 is OPEN" || echo "Port 8000 is CLOSED"
        exit 1
    fi
    echo "Waiting for backend at $BACKEND_URL... ($RETRY_COUNT/$MAX_RETRIES)"
    # Show verbose error every 10 attempts
    if [ $((RETRY_COUNT % 10)) -eq 0 ]; then
        curl -v --max-time 2 "$BACKEND_URL" 2>&1 | grep -E "Connection|Connected|error"
    fi
    sleep 5
done

echo "✅ Backend is reachable at $BACKEND_URL"

echo "Starting Total Validation Agent via Python orchestrator..."
python3 /app/scripts/generate_report.py

# The Python script will now orchestrate all validation steps and generate the report
python3 /app/scripts/generate_report.py

echo "Total Validation Agent Finished."

