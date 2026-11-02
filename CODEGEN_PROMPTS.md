# RIHA Stock AI Microservices Suite: Codegen Prompts Specification

This specification provides modular, production-ready code generation prompts for AI coding agents (such as Claude Code, Cursor, and GitHub Copilot). Each prompt is structured to enforce production-grade Java 21 and Spring Boot 3.3+ standards, Model Context Protocol (MCP) tool integration, event-driven streaming, deterministic guardrails, and quantitative financial rigor.

---

## Table of Contents
1. [Existing Microservices Enhancements](#1-existing-microservices-enhancements)
   - [Prompt 1: Market Ingestor (Port 8091) — Macro Regime and Microstructure](#prompt-1-market-ingestor-port-8091--macro-regime-and-microstructure)
   - [Prompt 2: Strategy Service (Port 8093) — Adversarial Debate and Position Lifecycle](#prompt-2-strategy-service-port-8093--adversarial-debate-and-position-lifecycle)
   - [Prompt 3: Robinhood MCP Server (Port 8092) — Synthetic Bracket Orders and SOR](#prompt-3-robinhood-mcp-server-port-8092--synthetic-bracket-orders-and-sor)
2. [New Greenfield Microservices](#2-new-greenfield-microservices)
   - [Prompt 4: Portfolio Risk Service (Port 8094) — Covariance, VaR, and Circuit Breakers](#prompt-4-portfolio-risk-service-port-8094--covariance-var-and-circuit-breakers)
   - [Prompt 5: Backtest Engine (Port 8095) — Tick Replay and Slippage Simulation](#prompt-5-backtest-engine-port-8095--tick-replay-and-slippage-simulation)
   - [Prompt 6: Sentiment & News Service (Port 8096) — News Ingestion and FinBERT Scoring](#prompt-6-sentiment-news-service-port-8096--news-ingestion-and-finbert-scoring)

---

## 1. Existing Microservices Enhancements

### Prompt 1: Market Ingestor (Port 8091) — Macro Regime and Microstructure

#### SYSTEM CONTEXT & GOAL
You are a Staff Software Engineer upgrading the existing Spring Boot 3.3 microservice `riha-stock-ai-market-ingestor` (default port 8091). The service currently provides Level-1 quotes, technical indicators (VWAP, RSI-14, MACD, EMAs), SEC EDGAR dilution tracking, and Spring AI MCP tools. You must implement three high-throughput sensory capabilities and expose them as native Model Context Protocol (MCP) tools:
1. Global Macroeconomic & Market Regime Sensory Feed
2. Order Flow Microstructure Analytics (Level-2 Imbalance & CVD)
3. SEC Form 4 Insider Transaction Ingestion

#### CODEBASE LOCATION
* Target Package: `com.rihasoftwaresolutions.stockai.market`
* Java Version: 21
* Spring Boot: 3.3+

#### SPECIFICATION OF CAPABILITIES TO IMPLEMENT
##### 1. Models & Records (`com.rihasoftwaresolutions.stockai.market.model`)
Create immutable Java records:
* `MarketRegimeSnapshot`:
  * `Instant timestamp`
  * `BigDecimal spyPrice`, `BigDecimal spySma20`, `BigDecimal spySma50`, `BigDecimal spySma200`
  * `BigDecimal vixLevel`, `String vixTermStructure` (CONTANGO, BACKWARDATION)
  * `BigDecimal us10yYield`, `BigDecimal dxyIndex`
  * `String macroRegime` (BULL_TRENDING, BEAR_TRENDING, CHOPPY_MEAN_REVERTING, HIGH_VOLATILITY_PANIC)
  * `List<MacroeconomicEventCountdown> upcomingEvents` (event name, release time, consensus, priority: HIGH/MEDIUM/LOW)
* `OrderFlowMicrostructureSnapshot`:
  * `String ticker`, `Instant timestamp`
  * `BigDecimal bidAskSpreadBps` (calculated as: `((Ask - Bid) / Mid) * 10,000`)
  * `BigDecimal orderBookImbalanceRatio` (calculated as: `(BidQty - AskQty) / (BidQty + AskQty)`)
  * `BigDecimal cumulativeVolumeDelta` (CVD: buying volume minus selling volume over the last 15 minutes)
  * `BigDecimal atr14` (14-period Average True Range)
  * `BigDecimal dollarTurnover20dMedian`
  * `boolean hardToBorrow`, `BigDecimal estimatedBorrowFee`
* `SecInsiderTransactionRecord`:
  * `String ticker`, `String filingId`, `LocalDate transactionDate`
  * `String insiderName`, `String officerTitle`
  * `String transactionCode` (P=Open Market Purchase, S=Sale, A=Grant)
  * `Long sharesTraded`, `BigDecimal transactionPrice`, `Long netRemainingShares`
  * `BigDecimal netDollarValue`

##### 2. Service Implementations (`com.rihasoftwaresolutions.stockai.market.service`)
* `MarketRegimeSensoryService`:
  * Maintains a cached `MarketRegimeSnapshot` in Redis (`riha:stockai:market:regime`) refreshed every 60 seconds.
  * Computes `macroRegime` classification using deterministic rules:
    * If `vixLevel >= 25.0`, set `HIGH_VOLATILITY_PANIC`.
    * If `spyPrice > spySma50` and `spySma50 > spySma200`, set `BULL_TRENDING`.
    * If `spyPrice < spySma50` and `spySma50 < spySma200`, set `BEAR_TRENDING`.
    * Otherwise, set `CHOPPY_MEAN_REVERTING`.
  * Integrates an in-memory calendar tracking Tier-1 US economic releases (FOMC statement, CPI, Core PPI, Non-Farm Payrolls).
* `OrderFlowAnalyticsService`:
  * Consumes tick stream and Level-2 order book depth from Redis cache or internal WebSocket buffers.
  * Computes rolling CVD (15m window) and order book imbalance across the top 5 bid/ask depth tiers.
  * Computes 14-period ATR using historical 5-minute candles.
* `SecForm4ScraperService`:
  * Polls SEC EDGAR Form 4 RSS/JSON endpoints on a 2-minute cron.
  * Parses XML payloads (`XMLStreamReader` or `JacksonXml`) to extract insider trades.
  * Caches 90-day insider activity under `riha:stockai:sec:insider:{TICKER}`.

##### 3. MCP Tools Registration (`com.rihasoftwaresolutions.stockai.market.mcp.MarketIngestorMcpTools`)
Add the following Spring AI `@Tool` / `@McpTool` methods:
* `@Tool(name = "getMarketRegimeSnapshot", description = "Retrieves live macroeconomic market regime, VIX structure, SPY trend, and upcoming tier-1 economic events")`  
  `public MarketRegimeSnapshot getMarketRegimeSnapshot();`
* `@Tool(name = "getOrderFlowMicrostructure", description = "Retrieves order book depth imbalance, spread in bps, CVD, and ATR-14 for a given ticker")`  
  `public OrderFlowMicrostructureSnapshot getOrderFlowMicrostructure(String ticker);`
* `@Tool(name = "getInsiderTransactions", description = "Returns recent SEC Form 4 insider purchases and sales within the past 90 days")`  
  `public List<SecInsiderTransactionRecord> getInsiderTransactions(String ticker);`

##### 4. Verification & Testing
Write JUnit 5 + Mockito tests:
* `MarketRegimeSensoryServiceTest`: Verifies regime transitions under different SPY SMAs and VIX levels.
* `OrderFlowAnalyticsServiceTest`: Verifies mathematical accuracy of `bidAskSpreadBps` and `orderBookImbalanceRatio` [-1.0 to +1.0].
* `MarketIngestorMcpToolsIntegrationTest`: Verifies MCP tool registration and JSON serialization.

---

### Prompt 2: Strategy Service (Port 8093) — Adversarial Debate and Position Lifecycle

#### SYSTEM CONTEXT & GOAL
You are a Lead Financial AI Architect enhancing `riha-stock-ai-strategy-service` (default port 8093). The service coordinates a 5-node Agentic DAG (`TECHNICAL_INGEST_NODE`, `SEC_AND_MEMORY_NODE`, `MULTI_STRATEGY_EVALUATION_NODE`, `CRITIC_REVIEW_GATE_NODE`, `AUTO_DECISION_EXECUTION_NODE`). You must upgrade this pipeline with three critical institutional capabilities:
1. Multi-Agent Adversarial Debate Panel (replacing single-pass prompt consensus in Node 3)
2. Quantitative ATR & Kelly-Conditioned Position Sizing
3. Active Position Lifecycle Worker with Breakeven Stop Ratchet and Pre-Flight Slippage Validation

#### CODEBASE LOCATION
* Target Package: `com.rihasoftwaresolutions.stockai.strategy`
* Java Version: 21
* Spring Boot: 3.3+

#### SPECIFICATION OF CAPABILITIES TO IMPLEMENT
##### 1. Adversarial Debate Panel (`com.rihasoftwaresolutions.stockai.strategy.dag.debate`)
Refactor Node 3 to spawn a three-agent panel before finalizing a recommendation:
* `LongGrowthAgent`: Synthesizes technical breakout strength, catalyst momentum, and order book buying imbalance.
* `BearRedTeamAgent`: Acts as Devil's Advocate. Interrogates thesis by checking:
  * SEC dilution risks & Form 4 insider selling.
  * Overextended RSI (> 70) or negative volume divergence.
  * Overhead supply clusters and short-borrow availability.
* `ArbiterSynthesisAgent`: Evaluates both cases. Computes a calibrated conviction score (0.00–1.00). Requires:
  * Calibrated conviction >= 0.70 for BUY.
  * Risk-to-Reward ratio >= 2.5:1 (Reward = Target Price - Entry; Risk = Entry - Stop Loss).
  * If the Bear Red-Team flags active SEC dilution or impending Tier-1 economic release within 30 minutes, force a `HOLD` verdict.

##### 2. Quantitative Volatility-Adjusted Sizing Engine (`com.rihasoftwaresolutions.stockai.strategy.risk`)
Create `VolatilityPositionSizingService`:
* Discard static dollar sizing ($4,800 cap).
* Calculate shares to allocate using 14-period Average True Range (ATR) and Fractional Kelly:
  $$\text{Target Dollar Risk} = \text{Account Equity} \times \text{Risk Per Trade (default 1.0\%)}$$
  $$\text{Stop Distance} = \max(\text{Entry} - \text{StopLossPrice}, 1.5 \times \text{ATR}_{14})$$
  $$\text{Target Share Count} = \min\left(\left\lfloor \frac{\text{Target Dollar Risk}}{\text{Stop Distance}} \right\rfloor, \left\lfloor \frac{\text{Max Notional Cap (\$15,000)}}{\text{Entry Price}} \right\rfloor \right)$$
* If `macroRegime == "HIGH_VOLATILITY_PANIC"`, scale `Target Share Count` by 0.50x.

##### 3. Pre-Flight Slippage & Drift Validator (`com.rihasoftwaresolutions.stockai.strategy.validator`)
Create `PreFlightSlippageValidator`:
* Executed atomically immediately prior to calling Node 4 Critic and Node 5 Execution.
* Queries `riha-stock-ai-market-ingestor` for the latest Level-1 quote.
* Compares current ask price to the price evaluated by the agent panel:
  $$\text{Slippage Bps} = \left| \frac{\text{CurrentAsk} - \text{AnalysisPrice}}{\text{AnalysisPrice}} \right| \times 10,000$$
* If `Slippage Bps > 35` (0.35%) or `Spread Bps > 25`, abort execution, record an audit event `PRE_FLIGHT_SLIPPAGE_ABORT`, and downgrade recommendation to `HOLD`.

##### 4. Active Position Lifecycle Worker (`com.rihasoftwaresolutions.stockai.strategy.lifecycle`)
Create `ActivePositionLifecycleWorker`:
* Subscribes to Apache Kafka topic `riha.stockai.market.ticks.live`.
* Tracks every open position stored in `StockTradeTransactionEntity`.
* Implements dynamic exit triggers:
  1. **Breakeven Ratchet**: If price rises $\ge 50\%$ toward the profit target, automatically update the stop-loss to `EntryPrice + 0.05%` (covering fees).
  2. **Trailing Stop**: If profit exceeds $+6.0\%$, ratchet stop-loss to lock in at least $+3.5\%$ gain.
  3. **Stale Momentum Exit**: If position has been held $> 120$ minutes and gain is between $-1.0\%$ and $+1.0\%$ with declining volume, trigger market exit order.
* On exit, dispatches order via `RobinhoodMcpClient` with verified Critic signature.

##### 5. Verification & Testing
* Unit test `VolatilityPositionSizingServiceTest`: Validates allocation scaling across varying ATR values.
* Integration test `AdversarialDebateCoordinatorTest`: Simulates conflicting Bull/Bear outputs and confirms Arbiter consensus logic.
* Integration test `ActivePositionLifecycleWorkerTest`: Simulates Kafka price updates and verifies stop-loss ratchet events.

---

### Prompt 3: Robinhood MCP Server (Port 8092) — Synthetic Bracket Orders and SOR

#### SYSTEM CONTEXT & GOAL
You are a Financial Systems Specialist enhancing the execution bridge `riha-stock-ai-robinhood-mcp-server` (default port 8092). The service integrates with the Robinhood Trading MCP Server (`https://agent.robinhood.com/mcp/trading`) and enforces zero-mock execution and HMAC-SHA256 Critic signatures. You must implement synthetic bracket order management, smart order execution routing, and real-time Kafka event streaming.

#### CODEBASE LOCATION
* Target Package: `com.rihasoftwaresolutions.stockai.robinhoodmcp`
* Java Version: 21
* Spring Boot: 3.3+

#### SPECIFICATION OF CAPABILITIES TO IMPLEMENT
##### 1. Synthetic Bracket Order Service (`com.rihasoftwaresolutions.stockai.robinhoodmcp.execution`)
Robinhood's basic equity API does not natively support bracket (OCO: One-Cancels-Other) orders. Implement `SyntheticBracketOrderService`:
* On receipt of an approved BUY order with `targetPrice` and `stopLossPrice`:
  1. Submits primary BUY limit order to Robinhood.
  2. Awaits fill confirmation via `getOrderExecutionStatus`.
  3. Upon full fill, creates an in-memory and Redis-backed `SyntheticBracketState`:
     * `bracketId` (UUID)
     * `robinhoodBuyOrderId`, `ticker`, `filledShares`, `fillPrice`
     * `targetPrice`, `stopLossPrice`, `trailingOffset`
     * `status` (ACTIVE, TARGET_TRIGGERED, STOP_TRIGGERED, CANCELLED)
  4. Spawns an internal state monitor listening to price updates.
  5. When price $\ge \text{targetPrice}$, dispatches SELL limit order at target price and marks bracket complete.
  6. When price $\le \text{stopLossPrice}$, dispatches immediate SELL order and marks bracket stopped out.

##### 2. Smart Order Routing & Pre-Execution Boundary Gate (`com.rihasoftwaresolutions.stockai.robinhoodmcp.gate`)
Enhance `CriticSignatureVerificationInterceptor`:
* Prior to order dispatch, query current Robinhood L1 quote.
* Ensure:
  * BUY orders: `currentAskPrice <= limitPrice` (never cross the spread at unfavorable terms).
  * Net unsettled funds and cash balance are sufficient.
  * Ticker is not currently halted on Nasdaq/NYSE (status code `TRADING_HALTED` -> reject with RFC 9457 ProblemDetail).

##### 3. Real-Time Kafka Execution Streamer (`com.rihasoftwaresolutions.stockai.robinhoodmcp.kafka`)
Create `OrderExecutionKafkaProducer`:
* Publishes execution events to Apache Kafka topic `riha.stockai.execution.events`:
  * `OrderSubmittedEvent`
  * `OrderFilledEvent` (fill price, shares, execution timestamp, commission/fee = $0.00)
  * `OrderCancelledEvent`
  * `BracketStopLossTriggeredEvent`
  * `BracketTargetReachedEvent`
* Serialized using standard JSON schema with idempotency key (`decisionId` + event type).

##### 4. Session Health & Auth Heartbeat (`com.rihasoftwaresolutions.stockai.robinhoodmcp.auth`)
Create `RobinhoodSessionHealthHeartbeat`:
* Background daemon running every 5 minutes.
* Validates active token validity against `https://agent.robinhood.com/mcp/trading`.
* If token expires within 15 minutes, executes token refresh or triggers alert event `ROBINHOOD_AUTH_EXPIRING_WARNING`.
* Exposes health status under Spring Boot Actuator: `/actuator/health/robinhoodSession`.

##### 5. Verification & Testing
* Unit test `SyntheticBracketOrderServiceTest`: Simulates price movements and verifies OCO cancellation behavior.
* Integration test `CriticSignatureGateTest`: Confirms valid signatures pass and modified payloads trigger HTTP 403 Forbidden.

---

## 2. New Greenfield Microservices

### Prompt 4: Portfolio Risk Service (Port 8094) — Covariance, VaR, and Circuit Breakers

#### SYSTEM CONTEXT & GOAL
You are a Principal Backend Engineer building a brand new microservice: `riha-stock-ai-portfolio-risk-service` on port 8094. This service acts as the centralized portfolio risk guardian for the RIHA Stock AI platform. It prevents portfolio overexposure, calculates rolling covariance, models Value-at-Risk (VaR), and executes firm-wide circuit breakers.

#### PROJECT SETUP
* Artifact: `riha-stock-ai-portfolio-risk-service`
* Port: `8094`
* Java 21, Spring Boot 3.3.4
* Dependencies: `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-data-redis`, `spring-kafka`, `postgresql`, `flyway-core`, `micrometer-registry-prometheus`, `commons-math3` (for matrix and covariance math).

#### CORE FUNCTIONAL REQUIREMENTS
##### 1. Covariance & Correlation Matrix Engine (`com.rihasoftwaresolutions.stockai.risk.engine`)
Create `PortfolioCovarianceEngine`:
* Ingests daily return series (past 60 trading days) for all active portfolio positions + SPY benchmark.
* Uses Apache Commons Math `PearsonsCorrelation` and `Covariance` to maintain real-time correlation matrix:
  $$\rho_{X,Y} = \frac{\text{cov}(X, Y)}{\sigma_X \sigma_Y}$$
* When a candidate stock is submitted for evaluation via REST endpoint:
  * Calculates prospective correlation against existing open holdings.
  * If correlation $\rho > 0.75$ with an already-held position in the same sector, flags `HIGH_CROSS_CORRELATION_WARNING`.

##### 2. Value-at-Risk (VaR) & CVaR Calculator (`com.rihasoftwaresolutions.stockai.risk.var`)
Create `ValueAtRiskCalculator`:
* Calculates 1-day 95% and 99% Parametric and Historical VaR:
  $$\text{Parametric VaR}_{95\%} = \text{Portfolio Equity} \times (1.645 \times \sigma_{\text{portfolio}} - \mu_{\text{portfolio}})$$
* Computes Conditional VaR (CVaR / Expected Shortfall): Expected loss given that loss exceeds the 95% VaR threshold.
* Rejects candidate trades if prospective total portfolio VaR exceeds 3.5% of total account capital.

##### 3. Portfolio Exposure & Sector Limits
Enforce institutional guardrails:
* Maximum Gross Equity Exposure: $\le 100\%$ (no margin leverage).
* Maximum Sector Concentration: $\le 25\%$ of portfolio equity in any single GICS sector.
* Maximum Single Stock Allocation: $\le 10\%$ of total equity.
* Portfolio Beta Cap: $\le 1.35\times$ relative to SPY.

##### 4. Real-Time Account Drawdown Circuit Breaker (`com.rihasoftwaresolutions.stockai.risk.circuitbreaker`)
Create `AccountDrawdownCircuitBreaker`:
* Tracks starting day equity (at 09:30 AM EST).
* Continuously calculates intraday drawdown percentage:
  $$\text{Drawdown} = \frac{\text{Current Total Equity} - \text{Day Open Equity}}{\text{Day Open Equity}}$$
* **Tier 1 Circuit Breaker (-2.0%)**: Restricts new BUY orders to high-conviction only (confidence $\ge 0.85$, halved sizing).
* **Tier 2 Circuit Breaker (-3.0%)**: Halts all autonomous entries for the remainder of the trading day; sends urgent notification via Kafka.

##### 5. REST API & MCP Tools (`com.rihasoftwaresolutions.stockai.risk.api`)
* `POST /api/v1/risk/pre-trade-check`:
  * Request: `PreTradeRiskCheckRequest(ticker, sector, proposedShares, limitPrice, stopLossPrice)`
  * Response: `RiskApprovalVerdict(approved: boolean, adjustedMaxShares: int, rejectionReasons: List<String>, portfolioVaRPostTrade: BigDecimal)`
* `GET /api/v1/risk/portfolio-heat`:
  * Returns current exposure, sector breakdown, top correlations, portfolio beta, and current VaR.
* `POST /api/v1/risk/emergency-kill-switch`:
  * Manually or programmatically freezes all automated order dispatching across the system.

##### 6. Database Schema (Flyway `V1__init_risk_schema.sql`)
* Tables:
  * `portfolio_risk_snapshots`: `id`, `timestamp`, `total_equity`, `cash`, `var_95_1d`, `cvar_95`, `portfolio_beta`, `max_drawdown_pct`.
  * `sector_exposure_logs`: `id`, `snapshot_id`, `sector_name`, `exposure_dollars`, `exposure_pct`.
  * `risk_circuit_breaker_events`: `id`, `timestamp`, `level` (TIER_1, TIER_2, MANUAL), `trigger_reason`, `resolved_at`.

##### 7. Verification & Testing
* Unit tests verifying correlation matrix calculations and CVaR calculations against deterministic datasets.
* Integration test for `pre-trade-check` confirming that sector limit breaches (>25%) return `approved: false`.

---

### Prompt 5: Backtest Engine (Port 8095) — Tick Replay and Slippage Simulation

#### SYSTEM CONTEXT & GOAL
You are a Quantitative Software Engineer building the brand new microservice: `riha-stock-ai-backtest-engine` on port 8095. This microservice provides deterministic historical tick-level simulation, realistic slippage modeling, and paper-trading validation for prompts and strategies.

#### PROJECT SETUP
* Artifact: `riha-stock-ai-backtest-engine`
* Port: `8095`
* Java 21, Spring Boot 3.3.4
* Dependencies: `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `postgresql`, `flyway-core`, `duckdb` or `parquet-avro` (for fast columnar historical tick data reads), `jackson-databind`.

#### CORE FUNCTIONAL REQUIREMENTS
##### 1. Historical Tick Replay Engine (`com.rihasoftwaresolutions.stockai.backtest.engine`)
Create `TickReplayEngine`:
* Ingests compressed historical Parquet/CSV trade ticks and Level-2 quotes (e.g. Polygon.io / Databento formats).
* Replays market state tick-by-tick or 1-second snapshots with strict time-dilation control (e.g. 10x, 50x, or maximum simulation speed).
* Generates simulated MCP tool responses matching `riha-stock-ai-market-ingestor` contracts (`getUnderneathTechnicalSnapshot`, `getLiveQuoteAndTechnicals`).

##### 2. Realistic Market Impact & Slippage Simulator (`com.rihasoftwaresolutions.stockai.backtest.simulation`)
Create `RealisticSlippageSimulator`:
* Avoids zero-slippage assumptions.
* Models execution fill price using square-root market impact and bid-ask spread half-width:
  $$\text{Effective Fill Price} = \text{Ask Price} + \left( \frac{\text{Spread}}{2} \right) + \eta \cdot \sigma \cdot \sqrt{\frac{\text{Order Shares}}{\text{1-Minute Volume}}}$$
* Simulates partial fills: If order size exceeds 10% of 1-minute volume, only partial fills are granted per candle.
* Simulates short-borrow fees and borrowing constraints for short-side trades.

##### 3. Strategy Runner & Shadow Mode (`com.rihasoftwaresolutions.stockai.backtest.runner`)
Create `BacktestStrategyRunner`:
* Runs an isolated instance of the 5-node DAG logic against historical replay data.
* Records simulated trades in `BacktestTradeLogEntity`.
* Supports **Shadow Mode**: Subscribes to live candidate streams from `riha-stock-ai-strategy-service`, logs hypothetical fills in a paper trading database, and tracks performance without sending orders to Robinhood.

##### 4. Quantitative Performance Metrics Calculator (`com.rihasoftwaresolutions.stockai.backtest.metrics`)
Create `TearsheetMetricsCalculator`:
* Generates standard institutional tearsheet metrics:
  * **Sharpe Ratio** (annualized, 0% risk-free rate)
  * **Sortino Ratio** (downside deviation risk-adjusted return)
  * **Profit Factor** ($\sum \text{Gross Profits} / \sum \text{Gross Losses}$)
  * **Maximum Drawdown (MDD)** and **Calmar Ratio**
  * **Win Rate %**, **Average Win / Average Loss Ratio**
  * **Holding Duration Distribution**

##### 5. REST & SSE Endpoints (`com.rihasoftwaresolutions.stockai.backtest.controller`)
* `POST /api/v1/backtest/run`:
  * Request: `BacktestRunConfig(strategyVersion, startDate, endDate, tickers, initialCapital, slippageModel)`
  * Returns: `backtestId` (UUID)
* `GET /api/v1/backtest/{id}/progress`:
  * Server-Sent Events (SSE) streaming real-time simulation progress percentage and current P&L.
* `GET /api/v1/backtest/{id}/tearsheet`:
  * Returns complete JSON tearsheet with equity curve time series, trade logs, and metrics.

##### 6. Database Schema (Flyway `V1__init_backtest_schema.sql`)
* Tables:
  * `backtest_runs`: `id`, `strategy_version`, `start_date`, `end_date`, `initial_capital`, `final_equity`, `sharpe_ratio`, `max_drawdown_pct`, `win_rate`.
  * `backtest_trades`: `id`, `backtest_id`, `ticker`, `entry_time`, `exit_time`, `entry_price`, `exit_price`, `shares`, `pnl_dollar`, `pnl_pct`, `exit_reason`.

##### 7. Verification & Testing
* Unit test verifying `RealisticSlippageSimulator` produces non-zero realistic price penalties based on volume.
* Integration test executing a 5-day replay with known synthetic price series, asserting expected P&L calculations.

---

### Prompt 6: Sentiment & News Service (Port 8096) — News Ingestion and FinBERT Scoring

#### SYSTEM CONTEXT & GOAL
You are an NLP & Backend Systems Engineer building the new microservice: `riha-stock-ai-sentiment-news-service` on port 8096. This service offloads unstructured text ingestion, financial news wire parsing, social sentiment aggregation, and FinBERT sentiment scoring from the core market ingestor.

#### PROJECT SETUP
* Artifact: `riha-stock-ai-sentiment-news-service`
* Port: `8096`
* Java 21, Spring Boot 3.3.4
* Dependencies: `spring-boot-starter-web`, `spring-boot-starter-data-redis`, `spring-kafka`, `postgresql`, `flyway-core`, `spring-ai-transformers` (or ONNX Runtime Java `com.microsoft.onnxruntime:onnxruntime` for local FinBERT model inference).

#### CORE FUNCTIONAL REQUIREMENTS
##### 1. News Wire Ingestion & Deduplication (`com.rihasoftwaresolutions.stockai.sentiment.news`)
Create `NewsWireIngestionService`:
* Continuously polls and streams financial news feeds (Benzinga, PR Newswire, Business Wire, SEC News).
* Uses SHA-256 fingerprinting on normalized headline + first 200 characters to deduplicate identical syndicated press releases.
* Extracts tagged stock tickers from content (`$TICKER` regex and company entity dictionary lookup).

##### 2. Local FinBERT Sentiment Scoring Engine (`com.rihasoftwaresolutions.stockai.sentiment.nlp`)
Create `FinBertSentimentScoringEngine`:
* Runs an embedded ONNX model of `ProsusAI/finbert` (or via Spring AI Transformers) inside the JVM sandbox to achieve sub-20ms inference latency without external API cost.
* Tokenizes incoming headlines and abstracts (`HuggingFace` tokenizer / BPE).
* Output:
  * `SentimentLabel` (POSITIVE, NEGATIVE, NEUTRAL)
  * `PolarityScore`: Float between -1.0 (extremely negative) and +1.0 (extremely positive).
  * `Confidence`: Float between 0.0 and 1.0.

##### 3. Breaking Catalyst Urgency Classifier (`com.rihasoftwaresolutions.stockai.sentiment.catalyst`)
Create `CatalystUrgencyClassifier`:
* Evaluates news text against financial catalyst categories:
  * `FDA_APPROVAL_OR_REJECTION` (Biotech)
  * `EARNINGS_SURPRISE_BEAT_MISS`
  * `MERGER_ACQUISITION_TAKEOVER`
  * `MATERIAL_CONTRACT_AWARD`
  * `MANAGEMENT_REORGANIZATION`
* Assigns an `urgencyLevel` (CRITICAL, HIGH, ROUTINE) and flags whether the catalyst represents an immediate breakout catalyst.

##### 4. Kafka Producer & Redis Snapshot Cache (`com.rihasoftwaresolutions.stockai.sentiment.publisher`)
* Publishes high-conviction catalyst events to Kafka topic: `riha.stockai.catalysts.scored`.
* Caches the last 24 hours of aggregated sentiment score per ticker in Redis:
  * Key: `riha:stockai:sentiment:{TICKER}`
  * Value: `AggregatedSentimentSnapshot(meanPolarity24h, totalMentions, positiveCount, negativeCount, lastUpdated)`

##### 5. MCP Tools & REST APIs (`com.rihasoftwaresolutions.stockai.sentiment.api`)
* Spring AI `@Tool` / `@McpTool` methods:
  * `@Tool(name = "getTickerSentimentScore", description = "Retrieves 24-hour sentiment polarity [-1.0 to +1.0], mention volume, and recent headline sentiment for a ticker")`  
    `public AggregatedSentimentSnapshot getTickerSentimentScore(String ticker);`
  * `@Tool(name = "getBreakingCatalysts", description = "Returns breaking material news catalysts detected across US equities in the past 60 minutes")`  
    `public List<ScoredCatalystRecord> getBreakingCatalysts(int limit);`

##### 6. Verification & Testing
* Unit test `FinBertSentimentScoringEngineTest`: Runs test headlines ("Company beats EPS estimates by $0.40" vs "Company announces $50M dilutive stock offering") and asserts expected positive/negative polarity scores.
* Integration test for `NewsWireIngestionService` verifying headline deduplication logic.

