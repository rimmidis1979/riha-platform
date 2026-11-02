#!/usr/bin/env bash
set -euo pipefail

REGISTRY_REPO="rimmidis/riha-platform"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

SERVICES=(
  "riha-stock-ai-market-ingestor"
  "riha-stock-ai-strategy-service"
  "riha-stock-ai-robinhood-mcp-server"
  "riha-stock-ai-web"
  "riha-stock-ai-portfolio-risk-service"
  "riha-stock-ai-backtest-engine"
  "riha-stock-ai-sentiment-news-service"
)

echo "=================================================================="
echo "Building and Pushing 7 Stock AI Services (linux/amd64) to ${REGISTRY_REPO}"
echo "=================================================================="

for svc in "${SERVICES[@]}"; do
  IMAGE_TAG="${REGISTRY_REPO}:${svc}"
  echo "--> [BUILD] ${IMAGE_TAG} (platform: linux/amd64)"
  docker build --platform linux/amd64 -t "${IMAGE_TAG}" "${ROOT_DIR}/${svc}"
  echo "--> [PUSH]  ${IMAGE_TAG}"
  docker push "${IMAGE_TAG}"
  echo "--> [DONE]  ${svc} pushed successfully!"
  echo "------------------------------------------------------------------"
done

echo "All 7 Docker images built and pushed successfully to ${REGISTRY_REPO}!"

