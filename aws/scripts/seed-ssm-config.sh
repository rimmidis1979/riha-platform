#!/usr/bin/env bash
# ==============================================================================
# RIHA ENTERPRISE PLATFORM - SEED AWS SSM PARAMETER STORE
# SCP COMPLIANT: SSM Parameter Store used instead of Secrets Manager
# Target AWS Account: 172981085842 | Region: ${AWS_REGION:-us-east-2}
# ==============================================================================
set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-2}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

echo "--> Seeding AWS Systems Manager (SSM) Parameter Store in region: ${AWS_REGION}"

put_param() {
  local name="$1"
  local val="$2"
  local p_type="${3:-String}"
  echo "Setting SSM parameter: ${name} (${p_type})"
  aws ssm put-parameter \
    --name "${name}" \
    --value "${val}" \
    --type "${p_type}" \
    --overwrite \
    --region "${AWS_REGION}" || echo "Warning: Failed to set ${name}"
}

# 1. Global Shared Config (/config/application/*)
put_param "/config/application/spring.kafka.bootstrap-servers" "riha-kafka.riha.internal:9092"
put_param "/config/application/spring.data.redis.host" "riha-redis.riha.internal"
put_param "/config/application/spring.data.redis.port" "6379"
put_param "/config/application/spring.datasource.username" "riha_postgres"
put_param "/config/application/spring.datasource.password" "riha_postgres_secret_2026" "SecureString"
put_param "/config/application/spring.jpa.hibernate.ddl-auto" "update"
put_param "/config/application/spring.threads.virtual.enabled" "true"

put_param "/config/application/riha.services.vch-url" "http://riha-version-control-hub.riha.internal:8081"
put_param "/config/application/riha.services.validator-url" "http://riha-schema-validator.riha.internal:8082"
put_param "/config/application/riha.services.orchestrator-url" "http://riha-topology-orchestrator.riha.internal:8083"
put_param "/config/application/riha.services.mcp-gateway-url" "http://riha-mcp-gateway.riha.internal:8084"
put_param "/config/application/riha.services.critic-url" "http://riha-critic-engine.riha.internal:8085"
put_param "/config/application/riha.services.memory-url" "http://riha-memory-service.riha.internal:8086"
put_param "/config/application/riha.services.eval-url" "http://riha-eval-monitor.riha.internal:8087"
put_param "/config/application/riha.services.market-ingestor-url" "http://riha-stock-ai-market-ingestor.riha.internal:8091"
put_param "/config/application/riha.services.robinhood-mcp-url" "http://riha-stock-ai-robinhood-mcp-server.riha.internal:8092"
put_param "/config/application/riha.services.stock-strategy-url" "http://riha-stock-ai-strategy-service.riha.internal:8093"

# 2. Per-Service JDBC URLs (/config/<service-name>/spring.datasource.url)
put_param "/config/riha-version-control-hub/spring.datasource.url" "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/vch_db"
put_param "/config/riha-schema-validator/spring.datasource.url" "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/solar_auditor_schema"
put_param "/config/riha-topology-orchestrator/spring.datasource.url" "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/solar_orchestrator_db"
put_param "/config/riha-mcp-gateway/spring.datasource.url" "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/solar_mcp_registry"
put_param "/config/riha-critic-engine/spring.datasource.url" "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/solar_critic_db"
put_param "/config/riha-memory-service/spring.datasource.url" "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/solar_memory_db"
put_param "/config/riha-eval-monitor/spring.datasource.url" "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/solar_eval_db"
put_param "/config/riha-stock-ai-strategy-service/spring.datasource.url" "jdbc:postgresql://riha-postgres-pgvector.riha.internal:5432/riha_stock_ai_db"

# 3. External API Keys from local .env
if [[ -f "${ROOT_DIR}/agentic_ai_platform/.env" ]]; then
  source "${ROOT_DIR}/agentic_ai_platform/.env" || true
fi

put_param "/config/application/OPENAI_API_KEY" "${OPENAI_API_KEY:-live-openai-key-placeholder}" "SecureString"
put_param "/config/application/RIHA_MARKET_API_KEY" "${RIHA_MARKET_API_KEY:-live-market-key-placeholder}" "SecureString"
put_param "/config/application/ROBINHOOD_CLIENT_ID" "${ROBINHOOD_CLIENT_ID:-live-robinhood-client-id}" "SecureString"
put_param "/config/application/ROBINHOOD_PRIVATE_KEY" "${ROBINHOOD_PRIVATE_KEY:-live-robinhood-private-key}" "SecureString"

echo "--> SSM Parameter Store seeding script completed."
