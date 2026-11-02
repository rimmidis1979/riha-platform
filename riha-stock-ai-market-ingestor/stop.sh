#!/usr/bin/env bash
# ==============================================================================
# Microservice Shutdown Script for riha-stock-ai-market-ingestor (Zero Idle Cost: desired-count = 0)
# Usage: ./stop.sh
# ==============================================================================
set -euo pipefail

SERVICE_NAME="riha-stock-ai-market-ingestor"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for script_path in \
  "${SCRIPT_DIR}/../aws/scripts/stop-service.sh" \
  "${SCRIPT_DIR}/../../aws/scripts/stop-service.sh" \
  "${SCRIPT_DIR}/../../../aws/scripts/stop-service.sh" \
  "${SCRIPT_DIR}/aws/scripts/stop-service.sh"; do
  if [[ -f "${script_path}" ]]; then
    exec bash "${script_path}" "${SERVICE_NAME}" "$@"
  fi
done

echo "[-] ERROR: stop-service.sh not found." >&2
exit 1
