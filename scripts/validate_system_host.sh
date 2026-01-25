#!/bin/bash
set -e

echo "🚀 Starting Total Validation System (Host Wrapper)..."

# Ensure we are in the project root
cd "$(dirname "$0")/.."

echo "📍 Working directory: $(pwd)"

# 1. Start Environment
echo "🐳 Bringing up Docker environment..."
docker compose up -d --build

echo "⏳ Waiting for Validator to start and complete..."
# Follow logs of validator service
docker compose logs -f validator

# 2. Check Exit Code
VALIDATOR_EXIT_CODE=$(docker inspect validator --format='{{.State.ExitCode}}')

# 3. Copy Report
echo "📂 Copying validation reports to ./validation_artifacts_host..."
mkdir -p validation_artifacts_host
docker cp validator:/app/validation_artifacts/. ./validation_artifacts_host/ || echo "⚠️ Could not copy artifacts."

# 4. Result
if [ "$VALIDATOR_EXIT_CODE" -eq 0 ]; then
    echo "✅ Validation PASSED! System is Production-Ready."
    echo "📄 Report available at ./validation_artifacts_host/validation_report.md"
    # Optional: docker compose down
    exit 0
else
    echo "❌ Validation FAILED! System is NOT ready."
    echo "📄 Check report at ./validation_artifacts_host/validation_report.md and logs above."
    exit 1
fi
