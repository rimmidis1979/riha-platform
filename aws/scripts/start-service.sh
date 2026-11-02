#!/usr/bin/env bash
# ==============================================================================
# RIHA ENTERPRISE PLATFORM - SINGLE MICROSERVICE START / WAKEUP SCRIPT
# Scales ECS Service desired-count to 1+ and waits for task readiness
# Usage: ./start-service.sh <service-name> [desired-count]
# ==============================================================================
set -euo pipefail

SERVICE_NAME=${1:?Error: Microservice name is required (e.g., ./start-service.sh riha-version-control-hub 1)}
DESIRED_COUNT=${2:-1}
CLUSTER_NAME="${CLUSTER_NAME:-riha-agentic-ai-cluster}"
AWS_REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null || echo "us-east-2")}"

echo "=============================================================================="
echo "  Starting Microservice  : ${SERVICE_NAME}"
echo "  ECS Cluster            : ${CLUSTER_NAME}"
echo "  AWS Region             : ${AWS_REGION}"
echo "  Desired Task Count     : ${DESIRED_COUNT}"
echo "=============================================================================="

echo "[1/2] Updating ECS Service desired-count to ${DESIRED_COUNT}..."
aws ecs update-service \
  --cluster "${CLUSTER_NAME}" \
  --service "${SERVICE_NAME}" \
  --desired-count "${DESIRED_COUNT}" \
  --region "${AWS_REGION}" > /dev/null

echo "[2/2] Waiting for ${SERVICE_NAME} to stabilize..."
aws ecs wait services-stable \
  --cluster "${CLUSTER_NAME}" \
  --services "${SERVICE_NAME}" \
  --region "${AWS_REGION}"

# Print Active Task Details
TASK_ARNS=$(aws ecs list-tasks \
  --cluster "${CLUSTER_NAME}" \
  --service-name "${SERVICE_NAME}" \
  --desired-status RUNNING \
  --region "${AWS_REGION}" \
  --query "taskArns[]" \
  --output text 2>/dev/null || true)

echo "=============================================================================="
echo "✅ ${SERVICE_NAME} is live and healthy with desired-count=${DESIRED_COUNT}!"
if [ -n "${TASK_ARNS}" ] && [ "${TASK_ARNS}" != "None" ]; then
  echo ""
  echo "Task Information:"
  aws ecs describe-tasks \
    --cluster "${CLUSTER_NAME}" \
    --tasks ${TASK_ARNS} \
    --region "${AWS_REGION}" \
    --query "tasks[].{TaskArn:taskArn, Status:lastStatus, IP:containers[0].networkInterfaces[0].privateIpv4Address}" \
    --output table
fi
echo "=============================================================================="
