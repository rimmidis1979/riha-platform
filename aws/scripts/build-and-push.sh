#!/usr/bin/env bash
# ==============================================================================
# RIHA ENTERPRISE PLATFORM - CONTAINER BUILD & REGISTRY PUSH AUTOMATION
# SCP COMPLIANT: DUAL REGISTRY MODE (Docker Hub Public vs AWS ECR Mirror)
# Target AWS Account: 172981085842
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Configuration Defaults (Overridable via environment variables)
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-172981085842}"
AWS_REGION="${AWS_REGION:-us-east-1}"
IMAGE_REGISTRY_MODE="${IMAGE_REGISTRY_MODE:-DOCKER_IO_PUBLIC}" # DOCKER_IO_PUBLIC | AWS_ECR_MIRROR
DOCKERHUB_ORG="${DOCKERHUB_ORG:-rihasoftwaresolutions}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
SKIP_BUILD="${SKIP_BUILD:-false}"
SKIP_MAVEN="${SKIP_MAVEN:-false}"

echo "=============================================================================="
echo "RIHA PLATFORM - CONTAINER BUILD & PUSH PIPELINE"
echo "=============================================================================="
echo "  Target AWS Account    : ${AWS_ACCOUNT_ID}"
echo "  AWS Region            : ${AWS_REGION}"
echo "  Registry Mode         : ${IMAGE_REGISTRY_MODE}"
echo "  Image Tag             : ${IMAGE_TAG}"
echo "  Root Directory        : ${ROOT_DIR}"
echo "=============================================================================="

# All 12 Microservices and Frontends
SERVICES_PLATFORM=(
  "riha-version-control-hub"
  "riha-schema-validator"
  "riha-topology-orchestrator"
  "riha-mcp-gateway"
  "riha-critic-engine"
  "riha-memory-service"
  "riha-eval-monitor"
)

SERVICES_STOCK_AI=(
  "riha-stock-ai-market-ingestor"
  "riha-stock-ai-robinhood-mcp-server"
  "riha-stock-ai-strategy-service"
)

SERVICES_WEB=(
  "riha-agentic-ai-hub"
  "riha-stock-ai-web"
)

# ------------------------------------------------------------------------------
# STEP 1: AUTHENTICATION
# ------------------------------------------------------------------------------
if [[ "${IMAGE_REGISTRY_MODE}" == "AWS_ECR_MIRROR" ]]; then
  echo ""
  echo "--> Authenticating Docker CLI with AWS ECR (${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com)..."
  aws ecr get-login-password --region "${AWS_REGION}" | \
    docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
  REGISTRY_PREFIX="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
else
  REGISTRY_PREFIX="docker.io/${DOCKERHUB_ORG}"
  if [[ -n "${DOCKER_TOKEN:-}" && -n "${DOCKER_USER:-}" ]]; then
    echo ""
    echo "--> Authenticating Docker CLI with Docker Hub (${DOCKER_USER})..."
    echo "${DOCKER_TOKEN}" | docker login docker.io -u "${DOCKER_USER}" --password-stdin
  else
    echo ""
    echo "--> Using existing Docker Hub session or anonymous pull mode."
  fi
fi

# ------------------------------------------------------------------------------
# STEP 2: COMPILE BACKEND MICROSERVICES (IF NOT SKIPPED)
# ------------------------------------------------------------------------------
if [[ "${SKIP_MAVEN}" != "true" ]]; then
  echo ""
  echo "=============================================================================="
  echo "Compiling Java Backend Services via Maven (Java 17/21)..."
  echo "=============================================================================="
  
  if [[ -d "${ROOT_DIR}/agentic_ai_platform" ]]; then
    echo "--> Packaging agentic_ai_platform modules..."
    (cd "${ROOT_DIR}/agentic_ai_platform" && mvn clean package -DskipTests -q)
  fi

  if [[ -d "${ROOT_DIR}/stock-ai" ]]; then
    echo "--> Packaging stock-ai modules..."
    (cd "${ROOT_DIR}/stock-ai" && mvn clean package -DskipTests -q)
  fi
  echo "--> Java packaging completed successfully."
fi

# ------------------------------------------------------------------------------
# STEP 3: BUILD FRONTEND DISTRIBUTIONS
# ------------------------------------------------------------------------------
echo ""
echo "=============================================================================="
echo "Compiling React Vite Frontends..."
echo "=============================================================================="
if [[ -d "${ROOT_DIR}/agentic_ai_platform/web/riha-agentic-ai-hub" ]]; then
  echo "--> Building riha-agentic-ai-hub..."
  (cd "${ROOT_DIR}/agentic_ai_platform/web/riha-agentic-ai-hub" && npm run build --silent || npm run build)
fi

if [[ -d "${ROOT_DIR}/stock-ai/riha-stock-ai-web" ]]; then
  echo "--> Building riha-stock-ai-web..."
  (cd "${ROOT_DIR}/stock-ai/riha-stock-ai-web" && npm run build --silent || npm run build)
fi

# ------------------------------------------------------------------------------
# STEP 4: ENSURE ECR REPOSITORIES EXIST (IF AWS_ECR_MIRROR MODE)
# ------------------------------------------------------------------------------
if [[ "${IMAGE_REGISTRY_MODE}" == "AWS_ECR_MIRROR" ]]; then
  echo ""
  echo "--> Verifying / Creating AWS ECR Repositories..."
  ALL_SERVICES=("${SERVICES_PLATFORM[@]}" "${SERVICES_STOCK_AI[@]}" "${SERVICES_WEB[@]}")
  for svc in "${ALL_SERVICES[@]}"; do
    if ! aws ecr describe-repositories --repository-names "${svc}" --region "${AWS_REGION}" >/dev/null 2>&1; then
      echo "  Creating ECR repository: ${svc}..."
      aws ecr create-repository \
        --repository-name "${svc}" \
        --region "${AWS_REGION}" \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256 >/dev/null
    else
      echo "  ECR repository '${svc}' verified."
    fi
  done
fi

# ------------------------------------------------------------------------------
# STEP 5: BUILD & PUSH DOCKER IMAGES
# ------------------------------------------------------------------------------
echo ""
echo "=============================================================================="
echo "Building & Pushing All 12 Microservices to ${REGISTRY_PREFIX}"
echo "=============================================================================="

# 1. Platform Microservices
for svc in "${SERVICES_PLATFORM[@]}"; do
  SVC_DIR="${ROOT_DIR}/agentic_ai_platform/${svc}"
  TARGET_TAG="${REGISTRY_PREFIX}/${svc}:${IMAGE_TAG}"
  echo ""
  echo "--> [PLATFORM] Building ${TARGET_TAG} from ${SVC_DIR}"
  docker build -t "${TARGET_TAG}" "${SVC_DIR}"
  echo "--> Pushing ${TARGET_TAG}"
  docker push "${TARGET_TAG}"
done

# 2. Stock AI Microservices
for svc in "${SERVICES_STOCK_AI[@]}"; do
  SVC_DIR="${ROOT_DIR}/stock-ai/${svc}"
  TARGET_TAG="${REGISTRY_PREFIX}/${svc}:${IMAGE_TAG}"
  echo ""
  echo "--> [STOCK-AI] Building ${TARGET_TAG} from ${SVC_DIR}"
  docker build -t "${TARGET_TAG}" "${SVC_DIR}"
  echo "--> Pushing ${TARGET_TAG}"
  docker push "${TARGET_TAG}"
done

# 3. Web Frontends
for svc in "${SERVICES_WEB[@]}"; do
  if [[ "${svc}" == "riha-agentic-ai-hub" ]]; then
    SVC_DIR="${ROOT_DIR}/agentic_ai_platform/web/riha-agentic-ai-hub"
  else
    SVC_DIR="${ROOT_DIR}/stock-ai/riha-stock-ai-web"
  fi
  TARGET_TAG="${REGISTRY_PREFIX}/${svc}:${IMAGE_TAG}"
  echo ""
  echo "--> [FRONTEND] Building ${TARGET_TAG} from ${SVC_DIR}"
  docker build -t "${TARGET_TAG}" "${SVC_DIR}"
  echo "--> Pushing ${TARGET_TAG}"
  docker push "${TARGET_TAG}"
done

echo ""
echo "=============================================================================="
echo "SUCCESS: All 12 container images built and pushed successfully!"
echo "Registry: ${REGISTRY_PREFIX}"
echo "Image Tag: ${IMAGE_TAG}"
echo "=============================================================================="

