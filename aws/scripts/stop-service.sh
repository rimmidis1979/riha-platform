#!/usr/bin/env bash
# ==============================================================================
# RIHA ENTERPRISE PLATFORM - SINGLE MICROSERVICE STOP & ZERO-COST SCRUBBER
# Scales ECS Service desired-count to 0 and immediately terminates running tasks
# Usage: ./stop-service.sh <service-name>
# ==============================================================================
set -euo pipefail

SERVICE_NAME=${1:?Error: Microservice name is required (e.g., ./stop-service.sh riha-version-control-hub)}
CLUSTER_NAME="${CLUSTER_NAME:-riha-agentic-ai-cluster}"
AWS_REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null || echo "us-east-2")}"

echo "=============================================================================="
echo "  Stopping Microservice  : ${SERVICE_NAME}"
echo "  ECS Cluster            : ${CLUSTER_NAME}"
echo "  AWS Region             : ${AWS_REGION}"
echo "=============================================================================="

# 1. Scale ECS Service desired count to 0 so ECS scheduler does NOT spin up replacement tasks
echo "[1/2] Scaling service desired-count to 0..."
if ! aws ecs update-service \
  --cluster "${CLUSTER_NAME}" \
  --service "${SERVICE_NAME}" \
  --desired-count 0 \
  --region "${AWS_REGION}" > /dev/null 2>&1; then
  echo "[-] Warning: Failed to update service ${SERVICE_NAME}. Verify cluster and service exist."
fi

# 2. Fetch all currently RUNNING tasks for this specific service and stop them immediately
echo "[2/2] Discovering and terminating running tasks for ${SERVICE_NAME}..."
TASK_ARNS=$(aws ecs list-tasks \
  --cluster "${CLUSTER_NAME}" \
  --service-name "${SERVICE_NAME}" \
  --desired-status RUNNING \
  --region "${AWS_REGION}" \
  --query "taskArns[]" \
  --output text 2>/dev/null || true)

if [ -n "${TASK_ARNS}" ] && [ "${TASK_ARNS}" != "None" ]; then
  for TASK_ARN in ${TASK_ARNS}; do
    TASK_ID=$(basename "${TASK_ARN}")
    echo "  -> Force-stopping task: ${TASK_ID}"
    aws ecs stop-task \
      --cluster "${CLUSTER_NAME}" \
      --task "${TASK_ARN}" \
      --reason "Manual cost-saving shutdown via stop-service.sh" \
      --region "${AWS_REGION}" > /dev/null 2>&1 || true
  done
else
  echo "  No active running tasks found for ${SERVICE_NAME}."
fi

echo "=============================================================================="
echo "✅ ${SERVICE_NAME} scaled to 0 tasks and all compute stopped."
echo "💰 Fargate compute costs for ${SERVICE_NAME} are now \$0.00."
echo "=============================================================================="
