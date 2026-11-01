# RIHA Stock AI (`productId = "RIHA_STOCK_AI"`)

An enterprise-grade autonomous AI trading and decision system architected on top of the **RIHA Agentic AI Infrastructure Platform**.

## Architectural Overview

`riha-stock-ai` dynamically screens live US equities and executes an on-the-fly 5-node Agentic Directed Acyclic Graph (DAG) for every candidate:

```
[LIVE DISCOVERY SCREENER]
   ├── TOP_GAINERS_DAY
   ├── RVOL_BREAKOUT
   ├── SHORT_SQUEEZE_MICROCAP
   ├── VWAP_RECLAIM
   └── HIGH_CONVICTION_MULTI_FACTOR
           │
           ▼
[5-NODE AGENTIC DAG PIPELINE]
   ├── Node 1: TECHNICAL_SCAN (Live Yahoo Finance 5m OHLCV, VWAP, EMA9/21, RSI-14, MACD, L2 Spread)
   ├── Node 2: SEC_AND_MEMORY_SCAN (Live SEC EDGAR CIK/Filing Dilution Check + Episodic Memory Embeddings)
   ├── Node 3: STRATEGY_SYNTHESIS (Version Control Hub Prompts + Schema Validator Enforcement)
   ├── Node 4: CRITIC_REVIEW_GATE (Deterministic SpEL Guardrails + Semantic Convergence Score >= 0.78)
   └── Node 5: AUTO_EXECUTION (Robinhood Brokerage MCP Server with Cryptographic Approval Token)
           │
           ▼
[EXECUTIVE COMMAND WORKSPACE (:5174)]
   ├── View 1: Real-time Account & Performance Ribbon
   ├── View 2: Watchlist & Multi-Algorithm Scanner Table
   ├── View 3: Underneath 4-Pillar Deep Analysis Drawer
   └── View 4: Trade Execution Ledger & Raw Event Tracing
```

## Microservices Suite

| Module | Directory | Default Port | Base Package | Responsibility |
| :--- | :--- | :---: | :--- | :--- |
| **Market Ingestor** | `riha-stock-ai-market-ingestor` | `:8091` | `com.rihasoftwaresolutions.stockai.market` | Live market feeds, OHLCV technicals, SEC EDGAR filings |
| **Robinhood Brokerage MCP** | `riha-stock-ai-robinhood-mcp-server` | `:8092` | `com.rihasoftwaresolutions.stockai.robinhoodmcp` | Account balances, position tracking, order execution |
| **Strategy Service** | `riha-stock-ai-strategy-service` | `:8093` | `com.rihasoftwaresolutions.stockai.strategy` | Multi-stock DAG pipeline, scanner loop, command REST/SSE API |
| **Executive Web UI** | `riha-stock-ai-web` | `:5174` | React 18 + Vite | Executive Command Workspace & Decision Monitor |

## Strict Zero Mock Data Policy
All market prices, volume metrics, technical indicators, SEC filings, brokerage account balances, and order confirmations originate from live external feeds. In the event of an upstream disconnection, services fail explicitly with RFC 7807 `ProblemDetail` (`503 Service Unavailable`) rather than falling back to mock fixtures.
