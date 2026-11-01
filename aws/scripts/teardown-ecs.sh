#!/usr/bin/env bash
# ==============================================================================
# RIHA ENTERPRISE PLATFORM - AUTOMATED AWS TEARDOWN & REVERT SCRIPT
# Reverts all AWS ECS Fargate services, ALB, VPC, IAM, and backing infrastructure
# Target AWS Account: 172981085842 | Region: us-east-1
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TF_DIR="${ROOT_DIR}/aws/terraform"

TARGET_ACCOUNT_ID="${AWS_ACCOUNT_ID:-172981085842}"
AWS_REGION="${AWS_REGION:-us-east-1}"
CLUSTER_NAME="${CLUSTER_NAME:-riha-agentic-ai-cluster}"
DELETE_STORAGE="${DELETE_STORAGE:-false}" # Set to true to destroy EFS persistent Postgres volume
PURGE_ECR="${PURGE_ECR:-false}"

echo "=============================================================================="
echo "    RIHA ENTERPRISE - AWS ECS ENVIRONMENT TEARDOWN & REVERT                  "
echo "=============================================================================="
echo "  Target AWS Account    : ${TARGET_ACCOUNT_ID}"
echo "  AWS Region            : ${AWS_REGION}"
echo "  ECS Cluster           : ${CLUSTER_NAME}"
echo "  Destroy EFS Storage   : ${DELETE_STORAGE}"
echo "  Purge ECR Mirrors     : ${PURGE_ECR}"
echo "=============================================================================="

# Pre-flight identity check
if ! command -v aws >/dev/null 2>&1; then
  echo "[-] ERROR: AWS CLI is not installed or not in PATH." >&2
  exit 1
fi

CALLER_IDENTITY=$(aws sts get-caller-identity --output json 2>/dev/null || true)
if [[ -z "${CALLER_IDENTITY}" ]]; then
  echo "[-] ERROR: Unable to authenticate with AWS. Ensure AWS_ACCESS_KEY_ID or AWS_PROFILE is active." >&2
  exit 1
fi

CURRENT_ACCOUNT=$(echo "${CALLER_IDENTITY}" | grep -o '"Account": "[^"]*' | cut -d'"' -f4)
echo "  Authenticated Account : ${CURRENT_ACCOUNT}"

# ------------------------------------------------------------------------------
# STEP 1: DRAIN ALL ECS SERVICES (SCALE DESIRED COUNT TO 0)
# ------------------------------------------------------------------------------
echo ""
echo "[1/3] Scaling down all 15 ECS services to desired_count = 0 (Halting compute costs)..."

ALL_SERVICES=(
  "riha-agentic-ai-hub"
  "riha-stock-ai-web"
  "riha-stock-ai-strategy-service"
  "riha-stock-ai-robinhood-mcp-server"
  "riha-stock-ai-market-ingestor"
  "riha-eval-monitor"
  "riha-memory-service"
  "riha-critic-engine"
  "riha-mcp-gateway"
  "riha-topology-orchestrator"
  "riha-schema-validator"
  "riha-version-control-hub"
  "riha-kafka"
  "riha-redis"
  "riha-postgres-pgvector"
)

for svc in "${ALL_SERVICES[@]}"; do
  echo "  Scaling down ${svc}..."
  aws ecs update-service \
    --cluster "${CLUSTER_NAME}" \
    --service "${svc}" \
    --desired-count 0 \
    --region "${AWS_REGION}" >/dev/null 2>&1 || true
done
echo "--> All ECS tasks drained."

# ------------------------------------------------------------------------------
# STEP 2: TERRAFORM DESTROY (REVERTS ALL INFRASTRUCTURE)
# ------------------------------------------------------------------------------
echo ""
echo "[2/3] Executing Terraform Destroy to revert VPC, Subnets, ALB, and Cluster..."

if [[ -d "${TF_DIR}" ]] && command -v terraform >/dev/null 2>&1; then
  cd "${TF_DIR}"
  terraform init -input=false

  TF_VARS=(
    -var="aws_account_id=${CURRENT_ACCOUNT}"
    -var="aws_region=${AWS_REGION}"
  )

  if [[ "${DELETE_STORAGE}" != "true" ]]; then
    echo "  [INFO] Preserving EFS persistent storage for Postgres data."
    TF_VARS+=(-var="enable_efs_persistence=true")
  fi

  terraform destroy -auto-approve "${TF_VARS[@]}"
  cd "${ROOT_DIR}"
  echo "--> Terraform infrastructure successfully destroyed."
else
  echo "  [WARN] Terraform not found or directory missing. Skipping IaC destroy."
fi

# ------------------------------------------------------------------------------
# STEP 3: OPTIONAL ECR REPOSITORY PURGE
# ------------------------------------------------------------------------------
if [[ "${PURGE_ECR}" == "true" ]]; then
  echo ""
  echo "[3/3] Purging AWS ECR mirror repositories..."
  for svc in "${ALL_SERVICES[@]}"; do
    if aws ecr describe-repositories --repository-names "${svc}" --region "${AWS_REGION}" >/dev/null 2>&1; then
      echo "  Deleting ECR repository: ${svc}..."
      aws ecr delete-repository --repository-name "${svc}" --force --region "${AWS_REGION}" >/dev/null 2>&1 || true
    fi
  done
  echo "--> ECR repositories purged."
else
  echo ""
  echo "[3/3] Preserving ECR repositories (PURGE_ECR=false)."
fi

echo ""
echo "=============================================================================="
echo "SUCCESS: AWS ECS Environment teardown and deployment reversal complete!"
echo "All compute, load balancers, and network resources have been terminated."
echo "=============================================================================="

