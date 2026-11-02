#!/usr/bin/env bash
# ==============================================================================
# RIHA ENTERPRISE PLATFORM - FULL CLUSTER STARTUP / WAKEUP ORCHESTRATOR
# Scales all ECS services to desired-count 1+ in topological dependency waves
# Usage: ./start-all-microservices.sh [desired-count]
# ==============================================================================
set -euo pipefail

DESIRED_COUNT=${1:-1}
CLUSTER_NAME="${CLUSTER_NAME:-riha-agentic-ai-cluster}"
AWS_REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null || echo "us-east-2")}"
EC2_ASG_NAME="${EC2_ASG_NAME:-}"

echo "=============================================================================="
echo "    RIHA ENTERPRISE PLATFORM - FULL ECS CLUSTER WAKEUP & STARTUP"
echo "=============================================================================="
echo "  ECS Cluster   : ${CLUSTER_NAME}"
echo "  AWS Region    : ${AWS_REGION}"
echo "  Desired Count : ${DESIRED_COUNT}"
echo "=============================================================================="

# 1. Scale up EC2 ASG if configured
if [ -n "${EC2_ASG_NAME}" ]; then
  echo "[0/3] Scaling EC2 Auto Scaling Group '${EC2_ASG_NAME}' back up..."
  aws autoscaling update-auto-scaling-group \
    --auto-scaling-group-name "${EC2_ASG_NAME}" \
    --min-size 1 \
    --desired-capacity 2 \
    --region "${AWS_REGION}"
  echo "  Waiting 30s for EC2 instances to join cluster..."
  sleep 30
fi

# Multi-Wave Service Startup Plan
WAVE_1_BACKING=(
  "riha-postgres-pgvector"
  "riha-redis"
  "riha-kafka"
)

WAVE_2_CORE_PLATFORM=(
  "riha-version-control-hub"
  "riha-schema-validator"
  "riha-topology-orchestrator"
  "riha-mcp-gateway"
  "riha-critic-engine"
  "riha-memory-service"
  "riha-eval-monitor"
)

WAVE_3_STOCK_AND_WEB=(
  "riha-stock-ai-market-ingestor"
  "riha-stock-ai-robinhood-mcp-server"
  "riha-stock-ai-strategy-service"
  "riha-agentic-ai-hub"
  "riha-stock-ai-web"
)

scale_wave() {
  local wave_num="$1"
  local wave_name="$2"
  shift 2
  local services=("$@")

  echo ""
  echo "--> [Wave ${wave_num}] Starting ${wave_name}..."
  for svc in "${services[@]}"; do
    echo "    Scaling ${svc} -> ${DESIRED_COUNT}..."
    aws ecs update-service \
      --cluster "${CLUSTER_NAME}" \
      --service "${svc}" \
      --desired-count "${DESIRED_COUNT}" \
      --region "${AWS_REGION}" > /dev/null 2>&1 || true
  done
}

scale_wave 1 "Backing Stores (Postgres, Redis, Kafka)" "${WAVE_1_BACKING[@]}"
echo "  Waiting 15 seconds for backing storage connectivity..."
sleep 15

scale_wave 2 "Core Agentic AI Platform Microservices" "${WAVE_2_CORE_PLATFORM[@]}"
echo "  Waiting 15 seconds for core platform registration..."
sleep 15

scale_wave 3 "Stock AI Services & Web Workstations" "${WAVE_3_STOCK_AND_WEB[@]}"

# Catch any additional services found in cluster
ALL_SERVICES=$(aws ecs list-services \
  --cluster "${CLUSTER_NAME}" \
  --region "${AWS_REGION}" \
  --query "serviceArns[]" \
  --output text 2>/dev/null || true)

KNOWN_SERVICES=("${WAVE_1_BACKING[@]}" "${WAVE_2_CORE_PLATFORM[@]}" "${WAVE_3_STOCK_AND_WEB[@]}")

if [ -n "${ALL_SERVICES}" ] && [ "${ALL_SERVICES}" != "None" ]; then
  for svc_arn in ${ALL_SERVICES}; do
    svc_name=$(basename "${svc_arn}")
    if [[ ! " ${KNOWN_SERVICES[*]} " =~ " ${svc_name} " ]]; then
      echo "  -> Starting additional discovered service: ${svc_name} -> ${DESIRED_COUNT}"
      aws ecs update-service \
        --cluster "${CLUSTER_NAME}" \
        --service "${svc_name}" \
        --desired-count "${DESIRED_COUNT}" \
        --region "${AWS_REGION}" > /dev/null 2>&1 || true
    fi
  done
fi

echo ""
echo "=============================================================================="
echo "✅ All cluster services have been requested to start with desired-count=${DESIRED_COUNT}."
echo "   Run './aws/scripts/cluster-status.sh' to inspect live status and endpoint IPs."
echo "=============================================================================="
