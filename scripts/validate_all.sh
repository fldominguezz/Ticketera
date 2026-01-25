#!/bin/bash
set -e

echo "Starting Total Validation Agent via Python orchestrator..."

# The Python script will now orchestrate all validation steps and generate the report
python3 /app/scripts/generate_report.py

echo "Total Validation Agent Finished."

