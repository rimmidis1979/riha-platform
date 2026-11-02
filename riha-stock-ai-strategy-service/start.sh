#!/usr/bin/env bash
# ==============================================================================
# Microservice Startup / Wakeup Script for riha-stock-ai-strategy-service
# Usage: ./start.sh [desired-count]
# ==============================================================================
set -euo pipefail

SERVICE_NAME="riha-stock-ai-strategy-service"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for script_path in \
  "${SCRIPT_DIR}/../aws/scripts/start-service.sh" \
  "${SCRIPT_DIR}/../../aws/scripts/start-service.sh" \
  "${SCRIPT_DIR}/../../../aws/scripts/start-service.sh" \
  "${SCRIPT_DIR}/aws/scripts/start-service.sh"; do
  if [[ -f "${script_path}" ]]; then
    exec bash "${script_path}" "${SERVICE_NAME}" "$@"
  fi
done

echo "[-] ERROR: start-service.sh not found." >&2
exit 1
