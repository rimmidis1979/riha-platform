#!/usr/bin/env bash
set -euo pipefail

REGISTRY="docker.io"
DOCKER_USER="${DOCKER_USER:-rimmidis}"
DOCKER_TOKEN="${DOCKER_TOKEN:-dckr_pat__TNSEtCii_n41cOyubyMQUGZm7Q}"

AGENTIC_REPO="${REGISTRY}/${DOCKER_USER}/riha-agentic-ai-platform"
STOCK_AI_REPO="${REGISTRY}/${DOCKER_USER}/riha-platform"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=================================================================="
echo "1. Authenticating with Docker Registry (${REGISTRY}) as ${DOCKER_USER}"
echo "=================================================================="
echo "${DOCKER_TOKEN}" | docker login "${REGISTRY}" -u "${DOCKER_USER}" --password-stdin

echo "=================================================================="
echo "2. Building & Pushing riha-agentic-ai-platform images to ${AGENTIC_REPO}"
echo "=================================================================="
AGENTIC_SERVICES=(
  "riha-version-control-hub"
  "riha-schema-validator"
  "riha-topology-orchestrator"
  "riha-mcp-gateway"
  "riha-critic-engine"
  "riha-memory-service"
  "riha-eval-monitor"
)

for svc in "${AGENTIC_SERVICES[@]}"; do
  IMAGE_TAG="${AGENTIC_REPO}:${svc}"
  echo "--> Building ${IMAGE_TAG}"
  docker build -t "${IMAGE_TAG}" "${ROOT_DIR}/agentic_ai_platform/${svc}"
  echo "--> Pushing ${IMAGE_TAG}"
  docker push "${IMAGE_TAG}"
done

HUB_IMAGE="${AGENTIC_REPO}:riha-agentic-ai-hub"
echo "--> Building ${HUB_IMAGE}"
docker build -t "${HUB_IMAGE}" "${ROOT_DIR}/agentic_ai_platform/web/riha-agentic-ai-hub"
echo "--> Pushing ${HUB_IMAGE}"
docker push "${HUB_IMAGE}"

echo "=================================================================="
echo "3. Building & Pushing riha-stock-ai images to ${STOCK_AI_REPO}"
echo "=================================================================="
STOCK_SERVICES=(
  "riha-stock-ai-market-ingestor"
  "riha-stock-ai-robinhood-mcp-server"
  "riha-stock-ai-strategy-service"
  "riha-stock-ai-web"
  "riha-stock-web"
)

for svc in "${STOCK_SERVICES[@]}"; do
  IMAGE_TAG="${STOCK_AI_REPO}:${svc}"
  echo "--> Building ${IMAGE_TAG}"
  docker build -t "${IMAGE_TAG}" "${ROOT_DIR}/stock-ai/${svc}"
  echo "--> Pushing ${IMAGE_TAG}"
  docker push "${IMAGE_TAG}"
done

echo "=================================================================="
echo "All 12 images successfully built and pushed to ${REGISTRY}!"
echo "=================================================================="

