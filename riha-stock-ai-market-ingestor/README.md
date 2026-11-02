# RIHA Stock AI Market Ingestor (`riha-stock-ai-market-ingestor`)

**Live Real-Time Market Feed Ingestion, Technical Calculations & SEC EDGAR Catalyst Microservice**

- **Server Port**: `8091`
- **Base Package**: `com.rihasoftwaresolutions.stockai.market`
- **MCP Perimeter**: Exposes `@McpTool` primitives over HTTP/SSE
- **Zero Mock Policy**: Strict live Yahoo Finance 5m OHLCV, Level-2 Order Book and SEC EDGAR parsing

---

## 1. Architectural Responsibility & Capabilities

`riha-stock-ai-market-ingestor` acts as the real-time financial market perception sensory layer for the RIHA Stock AI suite. It continuously ingests live equity data, computes quantitative technical indicators, monitors SEC EDGAR filings for dilution or catalysts, and exposes high-speed MCP tools to `solar-mcp-gateway`.

### Key Technical Capabilities:
1. **Live OHLCV Technical Computation (`LiveMarketWebSocketAndStreamService`)**:
   - Calculates **VWAP**, **EMA-9 / EMA-21**, **RSI-14**, **MACD (12, 26, 9)**, and Relative Volume (**RVOL**) in real time.
   - Evaluates Level-2 order book depth, bid-ask spread, and market impact scores.
2. **SEC EDGAR Dilution & Catalyst Scanner**:
   - Scans Form 4 insider transactions, 8-K material events, S-3 shelf registrations, and ATM (At-The-Market) offering risks.
3. **Model Context Protocol (MCP) Tools (`MarketIngestorMcpTools`)**:
   - `fetch_live_market_quote_technicals`: Real-time quote, technical signals, and momentum metrics.
   - `fetch_sec_filing_dilution_check`: SEC filing risk assessment and catalyst detection.
   - `fetch_order_book_depth`: Level-2 order book bid/ask metrics and spread health.
4. **Resilient Failure Handling**:
   - Emits RFC 7807 `ProblemDetail` with `503 Service Unavailable` on upstream provider disconnects.

---

## 2. REST API & MCP Tools Reference

| Tool / Endpoint | Method | Path | Description |
| :--- | :---: | :--- | :--- |
| **`fetch_live_market_quote_technicals`** | `POST` | `/api/v1/market/mcp/tools/fetch_live_market_quote_technicals` | Fetches live quote, VWAP, EMA9/21, RSI-14, MACD, and spread. |
| **`fetch_sec_filing_dilution_check`** | `POST` | `/api/v1/market/mcp/tools/fetch_sec_filing_dilution_check` | Scans SEC EDGAR filings for dilution risk and active shelf offerings. |
| **`fetch_order_book_depth`** | `POST` | `/api/v1/market/mcp/tools/fetch_order_book_depth` | Fetches live Level-2 depth, bid-ask spread, and liquidity ratio. |
| **Health Check** | `GET` | `/actuator/health` | Spring Boot Actuator liveness and readiness probe. |

---

## 3. Environment Configuration

```env
SERVER_PORT=8091
AWS_REGION=us-east-2
SPRING_PROFILES_ACTIVE=default
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
Builds the Docker container image, pushes it to Docker Hub (`rimmidis/riha-platform:riha-stock-ai-market-ingestor`), updates the ECS task definition, and rolls out the deployment:
```bash
./deploy.sh [image-tag] [desired-count]
# Example: deploy latest image with 1 task
./deploy.sh latest 1
```

