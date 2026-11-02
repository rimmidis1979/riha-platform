# RIHA Stock AI Robinhood Brokerage MCP Server (`riha-stock-ai-robinhood-mcp-server`)

**Model Context Protocol (MCP) Live Brokerage Gateway & Cryptographic Execution Safety Guard**

- **Server Port**: `8092`
- **Base Package**: `com.rihasoftwaresolutions.stockai.robinhoodmcp`
- **Protocol**: Model Context Protocol (`@McpTool`) over HTTP & SSE
- **Security Gate**: Rejects any order missing a cryptographic Critic approval signature (`MissingCriticSignatureException`)

---

## 1. Architectural Responsibility & Capabilities

`riha-stock-ai-robinhood-mcp-server` serves as the secure execution bridge between autonomous AI agents and Robinhood brokerage accounts. To prevent unhedged hallucinated trades, all execution requests require an explicit digital cryptographic signature produced exclusively by `riha-critic-engine`.

### Key Technical Capabilities:
1. **Model Context Protocol (`@McpTool`) Execution**:
   - `fetch_live_buying_power_and_positions`: Retrieves real-time cash balance, margin buying power, and open stock positions.
   - `execute_trade_order`: Submits market or limit orders with mandatory stop-loss and take-profit bracket thresholds.
2. **Cryptographic Critic Guard**:
   - Validates that incoming trade payloads contain a valid `criticSignature` signed by the platform private key, verifying that Phase 1 SpEL guardrails and Phase 2 Semantic convergence passed.
3. **Zero-Mock Brokerage Connectivity**:
   - Connects directly to live brokerage interfaces. If live credentials are disconnected or invalid, immediately fails with `503 Service Unavailable` RFC 7807 `ProblemDetail`.

---

## 2. REST & MCP Tools Reference

| Tool / Endpoint | Method | Path | Description |
| :--- | :---: | :--- | :--- |
| **`fetch_live_buying_power_and_positions`** | `POST` | `/api/v1/robinhood/mcp/tools/fetch_live_buying_power_and_positions` | Live cash, portfolio market value, and open stock shares. |
| **`execute_trade_order`** | `POST` | `/api/v1/robinhood/mcp/tools/execute_trade_order` | Places buy/sell orders with mandatory `criticSignature` check. |
| **Health Check** | `GET` | `/actuator/health` | Spring Boot Actuator liveness and readiness probe. |

---

## 3. Environment Configuration

```env
SERVER_PORT=8092
ROBINHOOD_USERNAME=your_robinhood_account
ROBINHOOD_PASSWORD=your_robinhood_password
ROBINHOOD_MFA_SECRET=your_robinhood_totp_secret
AWS_REGION=us-east-2
```

---

## 4. Service Operations & Management Scripts

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
Builds the Docker container image, pushes it to Docker Hub (`rimmidis/riha-platform:riha-stock-ai-robinhood-mcp-server`), updates the ECS task definition, and rolls out the deployment:
```bash
./deploy.sh [image-tag] [desired-count]
# Example: deploy latest image with 1 task
./deploy.sh latest 1
```
