-- ==============================================================================
-- RIHA ENTERPRISE PLATFORM - POSTGRES PGVECTOR MULTI-DATABASE INITIALIZATION
-- Target Environment: AWS ECS Fargate / Local Docker (pgvector/pgvector:pg16)
-- Target Databases:
--   1. vch_db                (riha-version-control-hub)
--   2. solar_auditor_schema  (riha-schema-validator)
--   3. solar_mcp_registry    (riha-mcp-gateway)
--   4. solar_critic_db       (riha-critic-engine)
--   5. solar_memory_db       (riha-memory-service - pgvector embeddings)
--   6. solar_eval_db         (riha-eval-monitor)
--   7. riha_stock_ai_db      (riha-stock-ai-strategy-service & execution ledger)
-- ==============================================================================

-- 1. Create databases if not exists
SELECT 'CREATE DATABASE vch_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'vch_db')\gexec
SELECT 'CREATE DATABASE solar_auditor_schema' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'solar_auditor_schema')\gexec
SELECT 'CREATE DATABASE solar_mcp_registry' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'solar_mcp_registry')\gexec
SELECT 'CREATE DATABASE solar_critic_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'solar_critic_db')\gexec
SELECT 'CREATE DATABASE solar_memory_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'solar_memory_db')\gexec
SELECT 'CREATE DATABASE solar_eval_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'solar_eval_db')\gexec
SELECT 'CREATE DATABASE riha_stock_ai_db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'riha_stock_ai_db')\gexec

-- 2. Enable pgvector extension across databases
\c vch_db
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c solar_memory_db
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c solar_critic_db
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c solar_eval_db
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c riha_stock_ai_db
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c solar_auditor_schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c solar_mcp_registry
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE vch_db TO vchub_user;
GRANT ALL PRIVILEGES ON DATABASE solar_auditor_schema TO vchub_user;
GRANT ALL PRIVILEGES ON DATABASE solar_mcp_registry TO vchub_user;
GRANT ALL PRIVILEGES ON DATABASE solar_critic_db TO vchub_user;
GRANT ALL PRIVILEGES ON DATABASE solar_memory_db TO vchub_user;
GRANT ALL PRIVILEGES ON DATABASE solar_eval_db TO vchub_user;
GRANT ALL PRIVILEGES ON DATABASE riha_stock_ai_db TO vchub_user;

