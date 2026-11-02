#!/usr/bin/env bash
# ==============================================================================
# Microservice Status & Health Check Script for riha-stock-ai-strategy-service
# Usage: ./status.sh
# ==============================================================================
set -euo pipefail

SERVICE_NAME="riha-stock-ai-strategy-service"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for script_path in \
  "${SCRIPT_DIR}/../aws/scripts/status-service.sh" \
  "${SCRIPT_DIR}/../../aws/scripts/status-service.sh" \
  "${SCRIPT_DIR}/../../../aws/scripts/status-service.sh" \
  "${SCRIPT_DIR}/aws/scripts/status-service.sh"; do
  if [[ -f "${script_path}" ]]; then
    exec bash "${script_path}" "${SERVICE_NAME}" "$@"
  fi
done

echo "[-] ERROR: status-service.sh not found." >&2
exit 1
