#!/usr/bin/env bash
# ==============================================================================
# RIHA ENTERPRISE PLATFORM - CLUSTER STATUS & COST MONITOR
# Displays all services, desired/running counts, task IPs, and cost estimation
# Usage: ./cluster-status.sh
# ==============================================================================
set -euo pipefail

CLUSTER_NAME="${CLUSTER_NAME:-riha-agentic-ai-cluster}"
AWS_REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null || echo "us-east-2")}"

echo "=============================================================================="
echo "    RIHA ENTERPRISE PLATFORM - ECS CLUSTER STATUS & HEALTH MONITOR"
echo "=============================================================================="
echo "  ECS Cluster : ${CLUSTER_NAME}"
echo "  AWS Region  : ${AWS_REGION}"
echo "  Timestamp   : $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "=============================================================================="

# 1. Discover all services
SERVICE_ARNS=$(aws ecs list-services \
  --cluster "${CLUSTER_NAME}" \
  --region "${AWS_REGION}" \
  --query "serviceArns[]" \
  --output text 2>/dev/null || true)

TOTAL_SERVICES=0
TOTAL_DESIRED=0
TOTAL_RUNNING=0

if [ -n "${SERVICE_ARNS}" ] && [ "${SERVICE_ARNS}" != "None" ]; then
  echo ""
  echo "--- ECS Services Summary ---"
  printf "%-35s %-10s %-10s %-10s %-12s\n" "SERVICE NAME" "DESIRED" "RUNNING" "PENDING" "STATUS"
  printf "%-35s %-10s %-10s %-10s %-12s\n" "-----------------------------------" "-------" "-------" "-------" "------------"

  for SERVICE_ARN in ${SERVICE_ARNS}; do
    SERVICE_NAME=$(basename "${SERVICE_ARN}")
    SVC_INFO=$(aws ecs describe-services \
      --cluster "${CLUSTER_NAME}" \
      --services "${SERVICE_NAME}" \
      --region "${AWS_REGION}" \
      --query "services[0].[desiredCount, runningCount, pendingCount, status]" \
      --output text 2>/dev/null || echo "0 0 0 UNKNOWN")

    read -r d_count r_count p_count status <<< "${SVC_INFO}"
    printf "%-35s %-10s %-10s %-10s %-12s\n" "${SERVICE_NAME}" "${d_count}" "${r_count}" "${p_count}" "${status}"
    
    TOTAL_SERVICES=$((TOTAL_SERVICES + 1))
    TOTAL_DESIRED=$((TOTAL_DESIRED + d_count))
    TOTAL_RUNNING=$((TOTAL_RUNNING + r_count))
  done
else
  echo "No services found in cluster ${CLUSTER_NAME}."
fi

# 2. Discover running tasks & IPs
RUNNING_TASK_ARNS=$(aws ecs list-tasks \
  --cluster "${CLUSTER_NAME}" \
  --desired-status RUNNING \
  --region "${AWS_REGION}" \
  --query "taskArns[]" \
  --output text 2>/dev/null || true)

echo ""
echo "--- Active Tasks & IP Mapping ---"
if [ -n "${RUNNING_TASK_ARNS}" ] && [ "${RUNNING_TASK_ARNS}" != "None" ]; then
  aws ecs describe-tasks \
    --cluster "${CLUSTER_NAME}" \
    --tasks ${RUNNING_TASK_ARNS} \
    --region "${AWS_REGION}" \
    --query "tasks[].{TaskID:taskArn, Group:group, Status:lastStatus, IP:containers[0].networkInterfaces[0].privateIpv4Address}" \
    --output table
else
  echo "No active running tasks in cluster."
fi

# 3. Cost Mechanics Summary
echo ""
echo "=============================================================================="
echo "  Cluster Health Summary:"
echo "    Total Managed Services : ${TOTAL_SERVICES}"
echo "    Total Desired Tasks    : ${TOTAL_DESIRED}"
echo "    Total Running Tasks    : ${TOTAL_RUNNING}"
if [ "${TOTAL_RUNNING}" -eq 0 ]; then
  echo "  💰 COST STATUS: IDLE ZERO-COST ($0.00/hr compute burn)"
else
  # Estimated Fargate: ~$0.04048 per vCPU-hr + $0.004445 per GB-hr (~$0.02 - $0.05/hr/task)
  EST_COST=$(awk -v t="${TOTAL_RUNNING}" 'BEGIN { printf "%.2f", t * 0.035 }')
  echo "  ⚡ COST STATUS: ACTIVE (~$${EST_COST}/hr estimated compute burn for ${TOTAL_RUNNING} tasks)"
  echo "  💡 TIP: Run './aws/scripts/stop-all-microservices.sh' to halt all tasks and reduce cost to $0.00."
fi
echo "=============================================================================="
