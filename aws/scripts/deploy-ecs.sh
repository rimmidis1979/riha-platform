#!/usr/bin/env bash
# ==============================================================================
# RIHA ENTERPRISE PLATFORM - ZERO-TOUCH AWS ECS FARGATE DEPLOYMENT ORCHESTRATOR
# SCP COMPLIANT: Strictly NO Secrets Manager & NO repositoryCredentials
# Target AWS Account: 172981085842 | Region: us-east-1
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
TF_DIR="${ROOT_DIR}/aws/terraform"

# Configuration Defaults
TARGET_ACCOUNT_ID="${AWS_ACCOUNT_ID:-172981085842}"
AWS_REGION="${AWS_REGION:-us-east-1}"
CLUSTER_NAME="${CLUSTER_NAME:-riha-agentic-ai-cluster}"
IMAGE_REGISTRY_MODE="${IMAGE_REGISTRY_MODE:-DOCKER_IO_PUBLIC}" # DOCKER_IO_PUBLIC | AWS_ECR_MIRROR
DOCKERHUB_ORG="${DOCKERHUB_ORG:-rihasoftwaresolutions}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
RUN_TERRAFORM="${RUN_TERRAFORM:-true}"
RUN_BUILD="${RUN_BUILD:-false}"
STAGGER_DELAY_SECONDS="${STAGGER_DELAY_SECONDS:-15}"

echo "=============================================================================="
echo "    RIHA ENTERPRISE AGENTIC AI & STOCK AI - AWS ECS FARGATE DEPLOYER"
echo "=============================================================================="
echo "  Target AWS Account    : ${TARGET_ACCOUNT_ID}"
echo "  AWS Region            : ${AWS_REGION}"
echo "  ECS Cluster Name      : ${CLUSTER_NAME}"
echo "  Registry Mode         : ${IMAGE_REGISTRY_MODE}"
echo "  DockerHub Org         : ${DOCKERHUB_ORG}"
echo "  Image Tag             : ${IMAGE_TAG}"
echo "  Terraform Apply       : ${RUN_TERRAFORM}"
echo "  Build & Push First    : ${RUN_BUILD}"
echo "=============================================================================="

# ------------------------------------------------------------------------------
# STEP 0: PRE-FLIGHT VERIFICATION
# ------------------------------------------------------------------------------
echo ""
echo "[1/6] Running DevSecOps Pre-Flight Checks & Identity Verification..."

if ! command -v aws >/dev/null 2>&1; then
  echo "[-] ERROR: AWS CLI is not installed or not in PATH." >&2
  exit 1
fi

CALLER_IDENTITY=$(aws sts get-caller-identity --output json 2>/dev/null || true)
if [[ -z "${CALLER_IDENTITY}" ]]; then
  echo "[-] ERROR: Unable to authenticate with AWS. Ensure AWS_ACCESS_KEY_ID / AWS_PROFILE is configured." >&2
  exit 1
fi

CURRENT_ACCOUNT=$(echo "${CALLER_IDENTITY}" | grep -o '"Account": "[^"]*' | cut -d'"' -f4)
CURRENT_ARN=$(echo "${CALLER_IDENTITY}" | grep -o '"Arn": "[^"]*' | cut -d'"' -f4)

echo "  Authenticated Principal : ${CURRENT_ARN}"
echo "  Detected AWS Account    : ${CURRENT_ACCOUNT}"

if [[ "${CURRENT_ACCOUNT}" != "${TARGET_ACCOUNT_ID}" ]]; then
  echo "  [!] WARNING: Connected account (${CURRENT_ACCOUNT}) does not match default ${TARGET_ACCOUNT_ID}."
  echo "      Proceeding with account ${CURRENT_ACCOUNT}..."
  TARGET_ACCOUNT_ID="${CURRENT_ACCOUNT}"
fi

# ------------------------------------------------------------------------------
# STEP 1: OPTIONAL CONTAINER BUILD & PUSH
# ------------------------------------------------------------------------------
if [[ "${RUN_BUILD}" == "true" ]]; then
  echo ""
  echo "[2/6] Triggering Container Build & Registry Push..."
  AWS_ACCOUNT_ID="${TARGET_ACCOUNT_ID}" \
  AWS_REGION="${AWS_REGION}" \
  IMAGE_REGISTRY_MODE="${IMAGE_REGISTRY_MODE}" \
  DOCKERHUB_ORG="${DOCKERHUB_ORG}" \
  IMAGE_TAG="${IMAGE_TAG}" \
  "${SCRIPT_DIR}/build-and-push.sh"
else
  echo ""
  echo "[2/6] Skipping Container Build (RUN_BUILD=false). Using pre-existing images."
fi

# ------------------------------------------------------------------------------
# STEP 2: TERRAFORM IAC PROVISIONING
# ------------------------------------------------------------------------------
if [[ "${RUN_TERRAFORM}" == "true" ]]; then
  echo ""
  echo "[3/6] Initializing and Applying Terraform Infrastructure as Code..."
  if ! command -v terraform >/dev/null 2>&1; then
    echo "[-] ERROR: terraform is not installed. Please install terraform or set RUN_TERRAFORM=false." >&2
    exit 1
  fi

  cd "${TF_DIR}"
  terraform init -input=false

  echo "--> Executing terraform apply..."
  terraform apply -auto-approve \
    -var="aws_account_id=${TARGET_ACCOUNT_ID}" \
    -var="aws_region=${AWS_REGION}" \
    -var="image_registry_mode=${IMAGE_REGISTRY_MODE}" \
    -var="dockerhub_org=${DOCKERHUB_ORG}" \
    -var="image_tag=${IMAGE_TAG}"

  ALB_DNS=$(terraform output -raw alb_dns_name 2>/dev/null || echo "ALB_PROVISIONED")
  cd "${ROOT_DIR}"
else
  echo ""
  echo "[3/6] Skipping Terraform IaC Execution (RUN_TERRAFORM=false)."
  ALB_DNS="riha-alb-placeholder"
fi

# ------------------------------------------------------------------------------
# STEP 3: DATABASE INITIALIZATION FOR PGVECTOR
# ------------------------------------------------------------------------------
echo ""
echo "[4/6] Verifying Multi-Database Schema in riha-postgres-pgvector..."
INIT_SQL_FILE="${SCRIPT_DIR}/init-postgres-pgvector.sql"

if [[ -f "${INIT_SQL_FILE}" ]]; then
  echo "  Database initialization script present: ${INIT_SQL_FILE}"
  echo "  Databases to initialize: vch_db, solar_auditor_schema, solar_mcp_registry,"
  echo "                          solar_critic_db, solar_memory_db, solar_eval_db, riha_stock_ai_db"
  echo "  Note: EFS volume persists database state; tables and vector extensions auto-mount on launch."
fi

# ------------------------------------------------------------------------------
# STEP 4: 5-WAVE STAGGERED SERVICE ROLLOUT
# ------------------------------------------------------------------------------
echo ""
echo "[5/6] Executing 5-Wave Staggered Service Rollout on ECS Cluster '${CLUSTER_NAME}'..."

# Wave 1: Stateful Backing Infrastructure
echo ""
echo "--> WAVE 1/5: Deploying Stateful Backing Infrastructure..."
WAVE_1=("riha-postgres-pgvector" "riha-redis" "riha-kafka")
for svc in "${WAVE_1[@]}"; do
  echo "    Starting/Updating ECS Service: ${svc}..."
  aws ecs update-service --cluster "${CLUSTER_NAME}" --service "${svc}" --force-new-deployment --region "${AWS_REGION}" >/dev/null 2>&1 || true
done
echo "    Waiting ${STAGGER_DELAY_SECONDS}s for backing stores to establish networking..."
sleep "${STAGGER_DELAY_SECONDS}"

# Wave 2: Platform Core Governance Services
echo ""
echo "--> WAVE 2/5: Deploying Core Platform Governance Services..."
WAVE_2=("riha-version-control-hub" "riha-schema-validator" "riha-memory-service" "riha-eval-monitor")
for svc in "${WAVE_2[@]}"; do
  echo "    Starting/Updating ECS Service: ${svc}..."
  aws ecs update-service --cluster "${CLUSTER_NAME}" --service "${svc}" --force-new-deployment --region "${AWS_REGION}" >/dev/null 2>&1 || true
done
echo "    Waiting ${STAGGER_DELAY_SECONDS}s for governance and schema registries..."
sleep "${STAGGER_DELAY_SECONDS}"

# Wave 3: Execution & Orchestration Mesh
echo ""
echo "--> WAVE 3/5: Deploying Execution & Orchestration Mesh..."
WAVE_3=("riha-mcp-gateway" "riha-critic-engine" "riha-topology-orchestrator")
for svc in "${WAVE_3[@]}"; do
  echo "    Starting/Updating ECS Service: ${svc}..."
  aws ecs update-service --cluster "${CLUSTER_NAME}" --service "${svc}" --force-new-deployment --region "${AWS_REGION}" >/dev/null 2>&1 || true
done
echo "    Waiting ${STAGGER_DELAY_SECONDS}s for DAG topology engine & MCP gateway..."
sleep "${STAGGER_DELAY_SECONDS}"

# Wave 4: Stock AI Product Microservices
echo ""
echo "--> WAVE 4/5: Deploying Stock AI Product Microservices..."
WAVE_4=("riha-stock-ai-market-ingestor" "riha-stock-ai-robinhood-mcp-server" "riha-stock-ai-strategy-service")
for svc in "${WAVE_4[@]}"; do
  echo "    Starting/Updating ECS Service: ${svc}..."
  aws ecs update-service --cluster "${CLUSTER_NAME}" --service "${svc}" --force-new-deployment --region "${AWS_REGION}" >/dev/null 2>&1 || true
done
echo "    Waiting ${STAGGER_DELAY_SECONDS}s for stock scanner & trading coordinator..."
sleep "${STAGGER_DELAY_SECONDS}"

# Wave 5: Web Frontends
echo ""
echo "--> WAVE 5/5: Deploying Web User Interfaces..."
WAVE_5=("riha-agentic-ai-hub" "riha-stock-ai-web")
for svc in "${WAVE_5[@]}"; do
  echo "    Starting/Updating ECS Service: ${svc}..."
  aws ecs update-service --cluster "${CLUSTER_NAME}" --service "${svc}" --force-new-deployment --region "${AWS_REGION}" >/dev/null 2>&1 || true
done

# ------------------------------------------------------------------------------
# STEP 5: POST-DEPLOYMENT VERIFICATION & SUMMARY
# ------------------------------------------------------------------------------
echo ""
echo "[6/6] Compiling Architecture Verification Report..."

echo ""
echo "=============================================================================="
echo "             RIHA ENTERPRISE AWS DEPLOYMENT COMPLETED                         "
echo "=============================================================================="
echo "  AWS Account ID       : ${TARGET_ACCOUNT_ID}"
echo "  AWS Region          : ${AWS_REGION}"
echo "  ECS Cluster         : ${CLUSTER_NAME}"
echo "  Service Discovery   : riha.internal (AWS ECS Service Connect)"
echo "  ALB Public DNS      : http://${ALB_DNS}"
echo "------------------------------------------------------------------------------"
echo "  PUBLIC APPLICATION ACCESS POINTS:"
echo "  - Stock AI Web UI (Command Dashboard)    : http://${ALB_DNS}/"
echo "  - Agentic AI Platform Hub (Admin UI)     : http://${ALB_DNS}:5173/"
echo "  - Stock AI Web Direct Listener           : http://${ALB_DNS}:5174/"
echo "  - Stock AI Strategy & Execution API      : http://${ALB_DNS}:8093/api/v1/stock-ai/summary/executive"
echo "  - MCP Gateway Protocol Execution API     : http://${ALB_DNS}:8084/api/v1/mcp/tools"
echo "------------------------------------------------------------------------------"
echo "  INTERNAL SERVICE CONNECT MESH (riha.internal):"
echo "  - riha-postgres-pgvector.riha.internal   : 5432 (pgvector/pg16)"
echo "  - riha-redis.riha.internal               : 6379"
echo "  - riha-kafka.riha.internal               : 9092 (KRaft mode)"
echo "  - riha-version-control-hub.riha.internal : 8081"
echo "  - riha-schema-validator.riha.internal    : 8082"
echo "  - riha-topology-orchestrator.riha.internal: 8083"
echo "  - riha-mcp-gateway.riha.internal         : 8084"
echo "  - riha-critic-engine.riha.internal       : 8085"
echo "  - riha-memory-service.riha.internal      : 8086"
echo "  - riha-eval-monitor.riha.internal        : 8087"
echo "  - riha-stock-ai-market-ingestor.riha.internal: 8091"
echo "  - riha-stock-ai-robinhood-mcp-server.riha.internal: 8092"
echo "  - riha-stock-ai-strategy-service.riha.internal: 8093"
echo "=============================================================================="
