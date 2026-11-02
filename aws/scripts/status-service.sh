#!/usr/bin/env bash
# ==============================================================================
# RIHA ENTERPRISE PLATFORM - SINGLE MICROSERVICE STATUS INSPECTOR
# Displays desired/running count, task ID, private IP, and logs command
# Usage: ./status-service.sh <service-name>
# ==============================================================================
set -euo pipefail

SERVICE_NAME=${1:?Error: Microservice name is required (e.g., ./status-service.sh riha-version-control-hub)}
CLUSTER_NAME="${CLUSTER_NAME:-riha-agentic-ai-cluster}"
AWS_REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null || echo "us-east-2")}"

echo "=============================================================================="
echo "  Microservice Status : ${SERVICE_NAME}"
echo "  ECS Cluster         : ${CLUSTER_NAME}"
echo "  AWS Region          : ${AWS_REGION}"
echo "=============================================================================="

# Describe Service
aws ecs describe-services \
  --cluster "${CLUSTER_NAME}" \
  --services "${SERVICE_NAME}" \
  --region "${AWS_REGION}" \
  --query "services[0].{Name:serviceName, Status:status, Desired:desiredCount, Running:runningCount, Pending:pendingCount, TaskDefinition:taskDefinition}" \
  --output table

# List and Describe Running Tasks
TASK_ARNS=$(aws ecs list-tasks \
  --cluster "${CLUSTER_NAME}" \
  --service-name "${SERVICE_NAME}" \
  --desired-status RUNNING \
  --region "${AWS_REGION}" \
  --query "taskArns[]" \
  --output text 2>/dev/null || true)

if [ -n "${TASK_ARNS}" ] && [ "${TASK_ARNS}" != "None" ]; then
  echo ""
  echo "--- Running Tasks & Networking ---"
  aws ecs describe-tasks \
    --cluster "${CLUSTER_NAME}" \
    --tasks ${TASK_ARNS} \
    --region "${AWS_REGION}" \
    --query "tasks[].{TaskArn:taskArn, Status:lastStatus, Health:healthStatus, IP:containers[0].networkInterfaces[0].privateIpv4Address}" \
    --output table

  echo ""
  echo "CloudWatch Logs Command:"
  echo "  aws logs tail /ecs/riha/${SERVICE_NAME} --follow --region ${AWS_REGION}"
else
  echo ""
  echo "ℹ️  Service is currently STOPPED (desired-count=0, running=0)."
  echo "💰 Compute cost is $0.00."
  echo "💡 Run './aws/scripts/start-service.sh ${SERVICE_NAME}' to wake it up."
fi
echo "=============================================================================="
