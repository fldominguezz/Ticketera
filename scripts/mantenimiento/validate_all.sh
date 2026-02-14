#!/bin/bash
# set -e # Don't exit on error to allow log dumping

echo "--- 🚀 Total Validation Agent Started ---"
echo "--- Pre-Validation: Waiting for Services Connectivity ---"
MAX_RETRIES=60
sleep 5 # Initial grace period for networking

# Function to wait for a URL
wait_for_url() {
    local url=$1
    local name=$2
    local retry_count=0
    echo "Waiting for $name at $url..."
    until curl -s -k --max-time 2 "$url" > /dev/null; do
        retry_count=$((retry_count+1))
        if [ $retry_count -ge $MAX_RETRIES ]; then
            echo "❌ CRITICAL: $name did not become available."
            return 1
        fi
        echo "Waiting for $name... ($retry_count/$MAX_RETRIES)"
        sleep 5
    done
    echo "✅ $name is reachable"
    return 0
}

FAIL=0
wait_for_url "http://backend:8000/healthz" "Backend" || FAIL=1
wait_for_url "http://frontend:3000" "Frontend" || FAIL=1
wait_for_url "https://nginx" "Nginx (HTTPS)" || FAIL=1

if [ $FAIL -eq 1 ]; then
    echo "--- Connectivity Diagnostic Failed ---"
    exit 1
fi

echo "Starting Total Validation Agent via Python orchestrator..."
python3 /app/scripts/generate_report.py
RESULT=$?

if [ $RESULT -ne 0 ]; then
    echo "--- ❌ Validation Failed! Dumping Service Logs for Diagnosis ---"
    # Note: Inside the container, we don't have 'docker' command to dump other containers logs
    # unless we mount the socket, which we usually don't.
    # But we can try to see if any local logs exist.
    echo "Note: If running in CI, check the previous steps or artifacts for full logs."
    exit $RESULT
fi

echo "Total Validation Agent Finished."

