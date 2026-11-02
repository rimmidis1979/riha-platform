# RIHA Stock AI Robinhood Brokerage MCP Server (`riha-stock-ai-robinhood-mcp-server`)

**Model Context Protocol (MCP) Live Brokerage Gateway & Cryptographic Execution Safety Guard**
**Upstream Integration: [Robinhood Agentic Trading MCP Server](https://agent.robinhood.com/mcp/trading)**

- **Server Port**: `8092`
- **Base Package**: `com.rihasoftwaresolutions.stockai.robinhoodmcp`
- **Protocol**: Model Context Protocol (Streamable HTTP / SSE JSON-RPC 2.0) & REST API
- **Upstream Target**: `https://agent.robinhood.com/mcp/trading`
- **Security Gate**: Rejects any order missing a cryptographic Critic approval signature (`MissingCriticSignatureException`)

---

## 1. Architectural Responsibility & Capabilities

`riha-stock-ai-robinhood-mcp-server` serves as the secure execution bridge between autonomous AI agents and Robinhood's official **Agentic Trading MCP Server** (`https://agent.robinhood.com/mcp/trading`). To prevent unhedged hallucinated trades, all execution requests require an explicit digital cryptographic signature produced exclusively by `riha-critic-engine`.

### Key Technical Capabilities:
1. **Model Context Protocol (MCP JSON-RPC 2.0)**:
   - Exposes Streamable HTTP `/mcp` & `/mcp/trading` conforming to the official MCP protocol specifications (`initialize`, `tools/list`, `tools/call`).
   - Seamlessly compatible with Claude, Cursor, RIHA Agentic Workflow Coordinator, and MCP clients.
2. **Native Upstream Integration with `https://agent.robinhood.com/mcp/trading`**:
   - `get_portfolio`: Queries live portfolio equity, cash buying power, unsettled funds, and open positions.
   - `get_accounts`: Fetches active Robinhood Agentic trading account details.
   - `place_equity_order`: Dispatches buy/sell equity limit orders directly to Robinhood Agentic account.
   - `cancel_equity_order`: Revokes open working orders.
   - `invokeRobinhoodMcpTool`: Generic dynamic proxy pass-through to any upstream Robinhood MCP tool.
3. **Cryptographic Critic Guard**:
   - Validates that incoming trade payloads contain a valid `criticSignature` signed by the platform private key (`RIHA-CRITIC-SIG-v1...`), verifying that Phase 1 SpEL guardrails and Phase 2 Semantic convergence passed.
4. **Zero-Mock Brokerage Connectivity**:
   - Connects directly to live brokerage interfaces. If live credentials are disconnected or invalid, immediately fails with `503 Service Unavailable` RFC 7807 `ProblemDetail`. Zero mock data policy strictly forbids fake fills or simulated balances.

---

## 2. Model Context Protocol (MCP) & REST Endpoints Reference

### MCP JSON-RPC 2.0 Streamable HTTP Endpoints
- `POST /mcp`
- `POST /mcp/trading`
- `POST /api/v1/mcp`

| MCP Method | Description |
| :--- | :--- |
| **`initialize`** | Handshake returning protocol version `2024-11-05`, server capabilities, and server info with upstream target (`https://agent.robinhood.com/mcp/trading`). |
| **`tools/list`** | Lists all available MCP tools with JSON schema definitions. |
| **`tools/call`** | Invokes a specified MCP tool with arguments (verifying Critic signature for trading actions). |

### REST & Legacy Endpoints Reference

| Tool / Endpoint | Method | Path | Description |
| :--- | :---: | :--- | :--- |
| **Live Account & Portfolio** | `GET` | `/api/v1/robinhood/account` | Live cash balance, buying power, unrealized/realized P&L, and open positions. |
| **Submit Trade Order** | `POST` | `/api/v1/robinhood/orders` | Places live order on Robinhood with mandatory `criticApprovalToken`. |
| **Cancel Open Order** | `POST` | `/api/v1/robinhood/orders/{orderId}/cancel` | Cancels an open working Robinhood order. |
| **Order Status** | `GET` | `/api/v1/robinhood/orders/{orderId}` | Polls fill status, executed fill price, and slippage. |
| **MCP Tool Invoke** | `POST` | `/api/v1/mcp/tools/{toolName}` | Invokes tool by name with arguments. |
| **Robinhood MCP Proxy** | `POST` | `/api/v1/robinhood/mcp/proxy` | Direct pass-through proxy to `https://agent.robinhood.com/mcp/trading`. |
| **Health Check** | `GET` | `/actuator/health` | Spring Boot Actuator liveness and readiness probe. |

---

## 3. Environment Configuration

```env
SERVER_PORT=8092
ROBINHOOD_MCP_URL=https://agent.robinhood.com/mcp/trading
ROBINHOOD_BASE_URL=https://agent.robinhood.com/mcp/trading
ROBINHOOD_BEARER_TOKEN=your_robinhood_mcp_bearer_or_oauth_token
ROBINHOOD_CLIENT_ID=your_robinhood_client_id
ROBINHOOD_PRIVATE_KEY=your_robinhood_private_key
RIHA_CRITIC_SIGNING_SECRET=riha-enterprise-critic-hmac-key-2026
RIHA_MCP_GATEWAY_URL=http://localhost:8084
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
