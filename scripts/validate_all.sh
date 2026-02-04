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
        echo "--- Backend Container Logs (Diagnostic) ---"
        # We try to get logs if possible, though validator might not have docker access
        # The orchestrator will fail anyway if the next step fails
        exit 1
    fi
    echo "Waiting for backend... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 5
done

echo "✅ Backend is reachable at $BACKEND_URL"

echo "Starting Total Validation Agent via Python orchestrator..."
python3 /app/scripts/generate_report.py

# The Python script will now orchestrate all validation steps and generate the report
python3 /app/scripts/generate_report.py

echo "Total Validation Agent Finished."

