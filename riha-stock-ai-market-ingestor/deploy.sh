#!/usr/bin/env bash
# ==============================================================================
# Microservice Deployment Script for riha-stock-ai-market-ingestor
# Usage: ./deploy.sh [image-tag] [desired-count]
# ==============================================================================
set -euo pipefail

SERVICE_NAME="riha-stock-ai-market-ingestor"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

for script_path in \
  "${SCRIPT_DIR}/../aws/scripts/deploy-service.sh" \
  "${SCRIPT_DIR}/../../aws/scripts/deploy-service.sh" \
  "${SCRIPT_DIR}/../../../aws/scripts/deploy-service.sh" \
  "${SCRIPT_DIR}/aws/scripts/deploy-service.sh"; do
  if [[ -f "${script_path}" ]]; then
    exec bash "${script_path}" "${SERVICE_NAME}" "$@"
  fi
done

echo "[-] ERROR: deploy-service.sh not found." >&2
exit 1
