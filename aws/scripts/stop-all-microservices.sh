#!/usr/bin/env bash
# ==============================================================================
# RIHA ENTERPRISE PLATFORM - FULL CLUSTER SHUTDOWN SCRIPT (ZERO IDLE COST)
# Scales all ECS services to desired-count 0, kills all tasks, optional ASG to 0
# Usage: ./stop-all-microservices.sh
# ==============================================================================
set -euo pipefail

CLUSTER_NAME="${CLUSTER_NAME:-riha-agentic-ai-cluster}"
AWS_REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null || echo "us-east-2")}"
# Optional: Set your EC2 Auto Scaling Group name if using ECS on EC2 instances (leave empty for Fargate)
EC2_ASG_NAME="${EC2_ASG_NAME:-}"

echo "=============================================================================="
echo "    RIHA ENTERPRISE PLATFORM - FULL ECS CLUSTER SHUTDOWN"
echo "=============================================================================="
echo "  ECS Cluster : ${CLUSTER_NAME}"
echo "  AWS Region  : ${AWS_REGION}"
echo "  EC2 ASG     : ${EC2_ASG_NAME:-None (Fargate Serverless Mode)}"
echo "=============================================================================="

# Pre-flight check
if ! command -v aws >/dev/null 2>&1; then
  echo "[-] ERROR: AWS CLI is not installed or not in PATH." >&2
  exit 1
fi

# 1. Discover all ECS Services in the cluster and set desired-count to 0
echo ""
echo "[1/3] Discovering all microservices in cluster '${CLUSTER_NAME}'..."
SERVICE_ARNS=$(aws ecs list-services \
  --cluster "${CLUSTER_NAME}" \
  --region "${AWS_REGION}" \
  --query "serviceArns[]" \
  --output text 2>/dev/null || true)

if [ -n "${SERVICE_ARNS}" ] && [ "${SERVICE_ARNS}" != "None" ]; then
  for SERVICE_ARN in ${SERVICE_ARNS}; do
    SERVICE_NAME=$(basename "${SERVICE_ARN}")
    echo "  -> Scaling down service: ${SERVICE_NAME} (desired-count = 0)"
    aws ecs update-service \
      --cluster "${CLUSTER_NAME}" \
      --service "${SERVICE_NAME}" \
      --desired-count 0 \
      --region "${AWS_REGION}" > /dev/null 2>&1 || true
  done
  echo "  All ECS services scaled to desired-count = 0."
else
  echo "  No ECS services found in cluster ${CLUSTER_NAME}."
fi

# 2. Catch-all: Stop all remaining RUNNING tasks across the entire cluster
echo ""
echo "[2/3] Stopping all active RUNNING tasks across the cluster..."
ALL_TASK_ARNS=$(aws ecs list-tasks \
  --cluster "${CLUSTER_NAME}" \
  --desired-status RUNNING \
  --region "${AWS_REGION}" \
  --query "taskArns[]" \
  --output text 2>/dev/null || true)

if [ -n "${ALL_TASK_ARNS}" ] && [ "${ALL_TASK_ARNS}" != "None" ]; then
  for TASK_ARN in ${ALL_TASK_ARNS}; do
    TASK_ID=$(basename "${TASK_ARN}")
    echo "  -> Force-stopping task: ${TASK_ID}"
    aws ecs stop-task \
      --cluster "${CLUSTER_NAME}" \
      --task "${TASK_ARN}" \
      --reason "Full cluster shutdown to eliminate compute costs" \
      --region "${AWS_REGION}" > /dev/null 2>&1 || true
  done
  echo "  All running tasks terminated."
else
  echo "  No active running tasks found in cluster ${CLUSTER_NAME}."
fi

# 3. Optional: Scale down underlying EC2 instances if using EC2 launch type
echo ""
if [ -n "${EC2_ASG_NAME}" ]; then
  echo "[3/3] Scaling EC2 Auto Scaling Group '${EC2_ASG_NAME}' to 0 instances..."
  aws autoscaling update-auto-scaling-group \
    --auto-scaling-group-name "${EC2_ASG_NAME}" \
    --min-size 0 \
    --desired-capacity 0 \
    --region "${AWS_REGION}"
else
  echo "[3/3] Skipping EC2 ASG scale-down (Fargate mode / EC2_ASG_NAME not set)."
fi

# 4. Final verification
REMAINING_TASKS=$(aws ecs list-tasks \
  --cluster "${CLUSTER_NAME}" \
  --desired-status RUNNING \
  --region "${AWS_REGION}" \
  --query "taskArns[]" \
  --output text 2>/dev/null || true)

echo ""
echo "=============================================================================="
if [[ -z "${REMAINING_TASKS}" || "${REMAINING_TASKS}" == "None" ]]; then
  echo "✅ FULL SHUTDOWN COMPLETE: All microservices and tasks have been halted."
  echo "💰 Zero active tasks running. Cluster compute cost is strictly \$0.00."
else
  echo "⚠️  Some tasks are still draining: ${REMAINING_TASKS}"
fi
echo "=============================================================================="
