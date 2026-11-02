# RIHA Stock AI Strategy Coordinator (`riha-stock-ai-strategy-service`)

**Autonomous Multi-Stock 5-Node Agentic DAG Orchestrator, Discovery Scanner & Trade Decision Engine**

- **Server Port**: `8093`
- **Base Package**: `com.rihasoftwaresolutions.stockai.strategy`
- **Database**: PostgreSQL (`riha_stock_ai_db`) with full JPA audit trail
- **Event Backbone**: Apache Kafka producer & consumer

---

## 1. Architectural Responsibility & Capabilities

`riha-stock-ai-strategy-service` is the algorithmic core of the RIHA Stock AI platform. It coordinates discovery scanners across US equities, executes dynamic 5-node Agentic Directed Acyclic Graphs (DAGs) on candidates, audits decisions to PostgreSQL, and broadcasts real-time Server-Sent Events (SSE) to the Executive Web UI.

### 5-Node Agentic Execution Flow:
1. **Node 1: TECHNICAL_SCAN**: Gathers live OHLCV, VWAP, EMA9/21, RSI-14, MACD, and order book depth via `riha-stock-ai-market-ingestor`.
2. **Node 2: SEC_AND_MEMORY_SCAN**: Checks SEC EDGAR dilution risks and queries `riha-memory-service` for historical trade reflections on the ticker.
3. **Node 3: STRATEGY_SYNTHESIS**: Fetches versioned prompt templates from `riha-version-control-hub`, executes synthesis via `riha-mcp-gateway` (AWS Bedrock Nova Pro), and validates JSON contracts via `riha-schema-validator`.
4. **Node 4: CRITIC_REVIEW_GATE**: Submits synthesized decisions to `riha-critic-engine` for deterministic SpEL guardrails (max risk, position size, borrow fee) and semantic convergence scoring ($\ge 0.78$).
5. **Node 5: AUTO_EXECUTION**: If Critic-approved, cryptographically signs the execution payload and dispatches order placement to `riha-stock-ai-robinhood-mcp-server`.

---

## 2. Discovery Algorithms & Scanner

The service runs continuous background and on-demand scanner loops (`HourlyAndDailyTopStocksScannerLoop`):
- `TOP_GAINERS_DAY`: Extreme relative volume momentum leaders.
- `RVOL_BREAKOUT`: Above-average intraday volume clearing key resistance.
- `SHORT_SQUEEZE_MICROCAP`: High short interest with elevated borrow fees and low float.
- `VWAP_RECLAIM`: Reversals crossing back above volume-weighted average price.
- `HIGH_CONVICTION_MULTI_FACTOR`: Convergence of technical, fundamental, and memory scores.

---

## 3. REST & Streaming API Reference

| Method | Path | Description |
| :---: | :--- | :--- |
| `POST` | `/api/v1/stock-ai/strategy/evaluate/{ticker}` | Triggers live 5-node agentic DAG evaluation for a ticker. |
| `GET` | `/api/v1/stock-ai/strategy/decisions` | Returns historical trade decision entities with full rationale. |
| `GET` | `/api/v1/stock-ai/strategy/stream/decisions` | Server-Sent Events (SSE) stream for real-time live decisions. |
| `GET` | `/api/v1/stock-ai/scanner/trending` | Retrieves current trending watchlist candidates across algorithms. |
| `GET` | `/api/v1/stock-ai/deep-findings/{ticker}` | Returns 4-pillar underneath analysis breakdown for a stock. |
| `GET` | `/api/v1/stock-ai/portfolio/summary` | Live buying power, open positions, and PnL metrics. |
| `GET` | `/actuator/health` | Spring Boot Actuator liveness and readiness probe. |

---

## 4. Environment Configuration

```env
SERVER_PORT=8093
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/riha_stock_ai_db
SPRING_DATASOURCE_USERNAME=vchub_user
SPRING_DATASOURCE_PASSWORD=vchub_secret
APP_MARKET_INGESTOR_URL=http://localhost:8091
APP_ROBINHOOD_MCP_URL=http://localhost:8092
APP_ORCHESTRATOR_URL=http://localhost:8083
APP_CRITIC_URL=http://localhost:8085
APP_MEMORY_URL=http://localhost:8086
APP_VCHUB_URL=http://localhost:8081
```

---

## 5. Service Operations & Management Scripts

This microservice includes dedicated lifecycle and deployment automation scripts that interact directly with AWS ECS Fargate:

### 1. Start / Scale-Up Service
Scales the ECS task count from 0 (idle) to the desired count (default: 1) and waits for health stability:
```bash
./start.sh [desired-count]
# Example: start 1 instance
./start.sh 1
```

### 2. Stop / Scale-to-Zero Service
Scales the ECS task count to 0 for instant zero-idle compute cost:
```bash
./stop.sh
```

### 3. Check Live Status & Health
Fetches real-time ECS service status, task ARNs, desired/running task counts, container IPs, and Actuator health:
```bash
./status.sh
```

### 4. Build, Tag & Deploy Service
Builds the Docker container image, pushes it to Docker Hub (`rimmidis/riha-platform:riha-stock-ai-strategy-service`), updates the ECS task definition, and rolls out the deployment:
```bash
./deploy.sh [image-tag] [desired-count]
# Example: deploy latest image with 1 task
./deploy.sh latest 1
```
