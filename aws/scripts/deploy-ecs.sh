#!/usr/bin/env bash
# ==============================================================================
# RIHA ENTERPRISE PLATFORM - ZERO-TOUCH AWS ECS FARGATE DEPLOYMENT ORCHESTRATOR
# SCP COMPLIANT: Strictly NO Secrets Manager & NO repositoryCredentials
# Target AWS Account: 172981085842 | Authorized Region: us-east-2
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Configuration Defaults (Reflecting Verified Live AWS Execution)
TARGET_ACCOUNT_ID="${AWS_ACCOUNT_ID:-172981085842}"
AWS_REGION="${AWS_REGION:-us-east-2}"
CLUSTER_NAME="${CLUSTER_NAME:-riha-agentic-ai-cluster}"
DOCKERHUB_USER="${DOCKERHUB_USER:-rimmidis}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
RUN_PYTHON_ORCHESTRATOR="${RUN_PYTHON_ORCHESTRATOR:-true}"

echo "=============================================================================="
echo "    RIHA ENTERPRISE AGENTIC AI & STOCK AI - AWS ECS FARGATE DEPLOYER"
echo "=============================================================================="
echo "  Target AWS Account    : ${TARGET_ACCOUNT_ID}"
echo "  AWS Region            : ${AWS_REGION} (SCP Enforced)"
echo "  ECS Cluster Name      : ${CLUSTER_NAME}"
echo "  DockerHub User        : ${DOCKERHUB_USER}"
echo "  Image Tag             : ${IMAGE_TAG}"
echo "=============================================================================="

# Pre-flight check
if ! command -v aws >/dev/null 2>&1; then
  echo "[-] ERROR: AWS CLI is not installed or not in PATH." >&2
  exit 1
fi

CALLER_IDENTITY=$(aws sts get-caller-identity --output json 2>/dev/null || true)
if [[ -z "${CALLER_IDENTITY}" ]]; then
  echo "[-] ERROR: Unable to authenticate with AWS. Ensure AWS_ACCESS_KEY_ID is configured." >&2
  exit 1
fi

CURRENT_ACCOUNT=$(echo "${CALLER_IDENTITY}" | grep -o '"Account": "[^"]*' | cut -d'"' -f4)
echo "  Authenticated Account : ${CURRENT_ACCOUNT}"

echo ""
echo "--> Executing Zero-Touch Multi-Wave ECS Provisioning & Deployment..."
python3 "${SCRIPT_DIR}/auto-provision-and-deploy-ecs.py"

echo ""
echo "--> Verifying ECS Cluster Rollout & IP Endpoints..."
python3 "${SCRIPT_DIR}/verify-ecs-cluster.py"

echo ""
echo "--> Running Live Microservices & Integration Test Suite..."
python3 "${SCRIPT_DIR}/test-live-microservices.py"

echo ""
echo "=============================================================================="
echo "  [SUCCESS] All 15 Services Live & Verified on AWS ECS Fargate!"
echo "=============================================================================="
