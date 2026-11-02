#!/usr/bin/env bash
# ==============================================================================
# RIHA ENTERPRISE PLATFORM - SINGLE MICROSERVICE ECS DEPLOYER
# Builds, pushes container image, updates Task Definition, and scales service
# Usage: ./deploy-service.sh <service-name> [image-tag] [desired-count]
# ==============================================================================
set -euo pipefail

SERVICE_NAME=${1:?Error: Microservice name is required (e.g., ./deploy-service.sh riha-version-control-hub v1.0.0 1)}
IMAGE_TAG=${2:-latest}
DESIRED_COUNT=${3:-1}

# --- AWS Environment Configuration ---
AWS_REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null || echo "us-east-2")}"
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query "Account" --output text 2>/dev/null || echo "172981085842")}"
CLUSTER_NAME="${CLUSTER_NAME:-riha-agentic-ai-cluster}"
IMAGE_REGISTRY_MODE="${IMAGE_REGISTRY_MODE:-AWS_ECR_MIRROR}" # AWS_ECR_MIRROR | DOCKER_IO_PUBLIC
DOCKERHUB_ORG="${DOCKERHUB_ORG:-rihasoftwaresolutions}"

ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
if [[ "${IMAGE_REGISTRY_MODE}" == "DOCKER_IO_PUBLIC" ]]; then
  FULL_IMAGE_URI="docker.io/${DOCKERHUB_ORG}/${SERVICE_NAME}:${IMAGE_TAG}"
else
  FULL_IMAGE_URI="${ECR_REGISTRY}/${SERVICE_NAME}:${IMAGE_TAG}"
fi

echo "=============================================================================="
echo "  Deploying Microservice : ${SERVICE_NAME}"
echo "  Target Image           : ${FULL_IMAGE_URI}"
echo "  Cluster                : ${CLUSTER_NAME}"
echo "  Region                 : ${AWS_REGION}"
echo "  Desired Count          : ${DESIRED_COUNT}"
echo "=============================================================================="

# Pre-flight check
if ! command -v aws >/dev/null 2>&1; then
  echo "[-] ERROR: AWS CLI is not installed or not in PATH." >&2
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "[-] ERROR: jq is not installed. Please install jq (e.g., brew install jq or apt install jq)." >&2
  exit 1
fi

# Locate Service Directory and Dockerfile
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CWD="$(pwd)"
SERVICE_DIR=""

CANDIDATES=(
  "${CWD}"
  "${CWD}/${SERVICE_NAME}"
  "${CWD}/agentic_ai_platform/${SERVICE_NAME}"
  "${CWD}/stock-ai/${SERVICE_NAME}"
  "${CWD}/agentic_ai_platform/web/${SERVICE_NAME}"
  "${SCRIPT_DIR}/../..//${SERVICE_NAME}"
  "${SCRIPT_DIR}/../../agentic_ai_platform/${SERVICE_NAME}"
  "${SCRIPT_DIR}/../../stock-ai/${SERVICE_NAME}"
  "${SCRIPT_DIR}/../../agentic_ai_platform/web/${SERVICE_NAME}"
  "${SCRIPT_DIR}/../${SERVICE_NAME}"
)

for cand in "${CANDIDATES[@]}"; do
  if [[ -f "${cand}/Dockerfile" ]]; then
    # Verify candidate matches service name or current directory
    cand_base=$(basename "${cand}")
    if [[ "${cand_base}" == "${SERVICE_NAME}" || "${cand}" == "${CWD}" ]]; then
      SERVICE_DIR="${cand}"
      break
    fi
  fi
done

if [[ -z "${SERVICE_DIR}" ]]; then
  echo "[-] Warning: Could not auto-detect Dockerfile for ${SERVICE_NAME}. Checking current directory..."
  if [[ -f "./Dockerfile" ]]; then
    SERVICE_DIR="."
  else
    echo "[-] ERROR: Dockerfile for ${SERVICE_NAME} not found. Please run from inside the service directory or project root." >&2
    exit 1
  fi
fi

echo "--> Service Directory: ${SERVICE_DIR}"

# 1. Authenticate with Registry
if [[ "${IMAGE_REGISTRY_MODE}" == "AWS_ECR_MIRROR" ]]; then
  echo "[1/4] Authenticating with Amazon ECR (${ECR_REGISTRY})..."
  aws ecr get-login-password --region "${AWS_REGION}" | \
    docker login --username AWS --password-stdin "${ECR_REGISTRY}"

  # Ensure ECR repository exists
  if ! aws ecr describe-repositories --repository-names "${SERVICE_NAME}" --region "${AWS_REGION}" >/dev/null 2>&1; then
    echo "  Creating Amazon ECR repository: ${SERVICE_NAME}..."
    aws ecr create-repository --repository-name "${SERVICE_NAME}" --region "${AWS_REGION}" >/dev/null
  fi
else
  echo "[1/4] Authenticating with Docker Hub (${DOCKERHUB_ORG})..."
  if [[ -n "${DOCKER_TOKEN:-}" && -n "${DOCKER_USER:-}" ]]; then
    echo "${DOCKER_TOKEN}" | docker login docker.io -u "${DOCKER_USER}" --password-stdin
  fi
fi

# 2. Build and Push Docker Image
echo "[2/4] Building and pushing container image (${FULL_IMAGE_URI})..."
# If maven project and target jar doesn't exist, build if needed
if [[ -f "${SERVICE_DIR}/pom.xml" && ! -d "${SERVICE_DIR}/target" ]]; then
  if command -v mvn >/dev/null 2>&1; then
    echo "  Building JAR with Maven in ${SERVICE_DIR}..."
    mvn -f "${SERVICE_DIR}/pom.xml" clean package -DskipTests
  fi
fi

docker build -t "${SERVICE_NAME}:${IMAGE_TAG}" "${SERVICE_DIR}"
docker tag "${SERVICE_NAME}:${IMAGE_TAG}" "${FULL_IMAGE_URI}"
docker push "${FULL_IMAGE_URI}"
echo "--> Image pushed successfully."

# 3. Update ECS Task Definition
echo "[3/4] Registering updated ECS Task Definition revision..."
TASK_DEF_ARN=$(aws ecs describe-services \
  --cluster "${CLUSTER_NAME}" \
  --services "${SERVICE_NAME}" \
  --region "${AWS_REGION}" \
  --query "services[0].taskDefinition" \
  --output text 2>/dev/null || echo "None")

if [[ -z "${TASK_DEF_ARN}" || "${TASK_DEF_ARN}" == "None" ]]; then
  echo "[-] Warning: Service ${SERVICE_NAME} does not exist yet in cluster ${CLUSTER_NAME}."
  echo "    Please provision the service via Terraform or auto-provision-and-deploy-ecs.py first."
  exit 1
fi

TASK_DEF_JSON=$(aws ecs describe-task-definition \
  --task-definition "${TASK_DEF_ARN}" \
  --region "${AWS_REGION}" \
  --query "taskDefinition")

# Clean read-only metadata fields and inject new image URI into the primary container
NEW_TASK_DEF=$(echo "${TASK_DEF_JSON}" | jq --arg IMAGE "${FULL_IMAGE_URI}" '
  .containerDefinitions[0].image = $IMAGE |
  del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy, .deregisteredAt)
')

NEW_TASK_DEF_ARN=$(aws ecs register-task-definition \
  --region "${AWS_REGION}" \
  --cli-input-json "${NEW_TASK_DEF}" \
  --query "taskDefinition.taskDefinitionArn" \
  --output text)

echo "  Registered Revision: ${NEW_TASK_DEF_ARN}"

# 4. Update ECS Service with new Task Definition and scale desired count
echo "[4/4] Updating ECS Service '${SERVICE_NAME}' and triggering rolling deployment..."
aws ecs update-service \
  --cluster "${CLUSTER_NAME}" \
  --service "${SERVICE_NAME}" \
  --task-definition "${NEW_TASK_DEF_ARN}" \
  --desired-count "${DESIRED_COUNT}" \
  --force-new-deployment \
  --region "${AWS_REGION}" > /dev/null

echo "Waiting for ${SERVICE_NAME} deployment to stabilize..."
aws ecs wait services-stable \
  --cluster "${CLUSTER_NAME}" \
  --services "${SERVICE_NAME}" \
  --region "${AWS_REGION}"

echo "=============================================================================="
echo "✅ ${SERVICE_NAME} successfully deployed and running! (Desired: ${DESIRED_COUNT})"
echo "=============================================================================="
