#!/bin/bash
# Remove set -e
# set -e

# Function to report status
report_status() {
    TEST_NAME=$1
    STATUS=$2
    MESSAGE=$3
    if [ "$STATUS" == "PASS" ]; then
        echo "✅ $TEST_NAME: PASS - $MESSAGE"
    else
        echo "❌ $TEST_NAME: FAIL - $MESSAGE"
        # We don't exit immediately here to allow all API tests to try running, 
        # unless it's a critical auth failure that blocks everything.
        # But for the orchestrator to fail, we should probably return non-zero at the end.
        export GLOBAL_FAIL=1
    fi
}

echo "--- C) Running API Validation (contract tests) ---"

# Use the hostname directly, pre-validation loop ensures it's ready
API_BASE_URL="http://backend:8000/api/v1"

# Aggressive sanitization: remove EVERYTHING except letters, numbers, @ and dots
ADMIN_USERNAME=$(echo "${FIRST_SUPERUSER:-admin@example.com}" | sed 's/[^a-zA-Z0-9@.]//g')
ADMIN_PASSWORD=$(echo "${FIRST_SUPERUSER_PASSWORD:-admin123}" | sed 's/[^a-zA-Z0-9@.]//g')
GLOBAL_FAIL=0

echo "--- Debug: Connectivity Check ---"
echo "Checking connectivity to backend:8000/healthz..."
curl -I -s --noproxy "*" --max-time 10 http://backend:8000/healthz || echo "❌ Still cannot connect to backend:8000"

# 1. Test Auth Login
echo "Testing Auth Login at $API_BASE_URL/auth/login with identifier '$ADMIN_USERNAME'..."
# Use curl with more verbose error reporting if it fails
LOGIN_RESPONSE=$(curl -s --noproxy "*" --retry 5 --retry-delay 2 -X POST \
  -H "Content-Type: application/json" \
  -d "{\"identifier\": \"$ADMIN_USERNAME\", \"password\": \"$ADMIN_PASSWORD\"}" \
  "$API_BASE_URL/auth/login")

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" == "null" ]; then
    echo "⚠️ Login with email failed, trying username 'admin'..."
    LOGIN_RESPONSE=$(curl -s --noproxy "*" -X POST \
      -H "Content-Type: application/json" \
      -d "{\"identifier\": \"admin\", \"password\": \"$ADMIN_PASSWORD\"}" \
      "$API_BASE_URL/auth/login")
    ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')
fi

if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
    report_status "Auth Login" "PASS" "Login successful, received access token."
else
    report_status "Auth Login" "FAIL" "Login failed. Response: $LOGIN_RESPONSE"
    # Dump backend logs on failure if we could, but we can't easily here.
    exit 1
fi

# Store token for subsequent requests
BEARER_TOKEN="Bearer $ACCESS_TOKEN"


# 2. Tickets CRUD
echo "Testing Tickets CRUD..."

# Get a valid ticket_type_id
TICKET_TYPE_ID=$(curl -s -X GET \
  -H "Authorization: $BEARER_TOKEN" \
  "$API_BASE_URL/ticket-types" | jq -r '.[0].id')

if [ -n "$TICKET_TYPE_ID" ] && [ "$TICKET_TYPE_ID" != "null" ]; then
    echo "Using Ticket Type ID: $TICKET_TYPE_ID"
else
    report_status "Ticket Type Discovery" "FAIL" "Could not find a valid ticket type."
    exit 1
fi

# Get a valid group_id (Area SOC or Admin)
GROUPS_JSON=$(curl -s -X GET -H "Authorization: $BEARER_TOKEN" "$API_BASE_URL/groups")
GROUP_ID=$(echo "$GROUPS_JSON" | jq -r '.[0].id // empty')

if [ -n "$GROUP_ID" ] && [ "$GROUP_ID" != "null" ]; then
    echo "Using discovered Group ID: $GROUP_ID"
else
    echo "⚠️ Group Discovery failed from API, trying fallback..."
    # Fallback to a known name if possible or fail
    GROUP_ID=$(echo "$GROUPS_JSON" | jq -r '.[] | select(.name=="Administración") | .id')
fi

if [ -z "$GROUP_ID" ] || [ "$GROUP_ID" == "null" ]; then
    report_status "Group Discovery" "FAIL" "Could not find a valid group. Response: $GROUPS_JSON"
    exit 1
fi

# List Tickets
TICKETS_LIST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET \
  -H "Authorization: $BEARER_TOKEN" \
  "$API_BASE_URL/tickets")

if [ "$TICKETS_LIST_STATUS" -eq 200 ]; then
    report_status "List Tickets" "PASS" "GET /tickets returned 200."
else
    report_status "List Tickets" "FAIL" "GET /tickets returned $TICKETS_LIST_STATUS."
fi

# Create Ticket
CREATE_TICKET_RESPONSE=$(curl -s -X POST \
  -H "Authorization: $BEARER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\": \"API Test Ticket\", \"description\": \"Created by validator\", \"priority\": \"normal\", \"ticket_type_id\": \"$TICKET_TYPE_ID\", \"group_id\": \"$GROUP_ID\", \"is_private\": false}" \
  "$API_BASE_URL/tickets")

TICKET_ID=$(echo "$CREATE_TICKET_RESPONSE" | jq -r '.id')

if [ -n "$TICKET_ID" ] && [ "$TICKET_ID" != "null" ]; then
    report_status "Create Ticket" "PASS" "Ticket created successfully. ID: $TICKET_ID"
else
    report_status "Create Ticket" "FAIL" "Failed to create ticket. Response: $CREATE_TICKET_RESPONSE"
fi

# 3. Forms & Audit
echo "Testing Forms & Audit Endpoints..."

# Audit Log (Admin only usually)
AUDIT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET \
  -H "Authorization: $BEARER_TOKEN" \
  "$API_BASE_URL/audit")

# Assuming 200 if implemented, or 404 if not found, or 403 if forbidden
if [ "$AUDIT_STATUS" -eq 200 ] || [ "$AUDIT_STATUS" -eq 403 ]; then
    report_status "Audit Endpoint" "PASS" "GET /audit returned $AUDIT_STATUS (Acceptable)."
else
    report_status "Audit Endpoint" "FAIL" "GET /audit returned $AUDIT_STATUS."
fi

# 4. Redirect Check (API should not redirect)
echo "Testing API Redirects..."
# Request a non-existent endpoint
NO_REDIRECT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X GET \
  -H "Authorization: $BEARER_TOKEN" \
  "$API_BASE_URL/non-existent-endpoint")

if [ "$NO_REDIRECT_STATUS" -ne 301 ] && [ "$NO_REDIRECT_STATUS" -ne 302 ]; then
    report_status "No Redirects" "PASS" "API did not return a redirect for 404."
else
    report_status "No Redirects" "FAIL" "API returned a redirect ($NO_REDIRECT_STATUS)."
fi

# 5. Auth Logout
echo "Testing Auth Logout..."
LOGOUT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Authorization: $BEARER_TOKEN" \
  "$API_BASE_URL/sessions/me/logout")

if [ "$LOGOUT_STATUS" -eq 200 ]; then
    report_status "Auth Logout" "PASS" "Logout successful."
else
    report_status "Auth Logout" "FAIL" "Logout failed with status: $LOGOUT_STATUS."
fi

if [ "$GLOBAL_FAIL" -eq 1 ]; then
    exit 1
fi

echo "All API Validation tests completed."
