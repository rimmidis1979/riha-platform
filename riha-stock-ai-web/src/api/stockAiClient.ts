import {
  AiTradeAuditTrail,
  AiTradeDecision,
  CriticFindings,
  CriticRiskGuardrails,
  LiveWatchlistQuote,
  MasterAuditSummary,
  OrderSubmissionRequest,
  OwnedStockPosition,
  PersonalizedAccountSummary,
  Rfc7807ProblemDetail,
  RobinhoodPortfolioSnapshot,
  SecMemoryFindings,
  StrategyDetails,
  StrategyPromptBinding,
  TechnicalFindings,
  TrendingStockItem,
} from '../types/stockAi';

export const STRATEGY_API_BASE =
  import.meta.env.VITE_RIHA_STOCK_STRATEGY_API_URL || 'http://localhost:8093';
export const MARKET_INGESTOR_API_BASE =
  import.meta.env.VITE_RIHA_MARKET_INGESTOR_API_URL || 'http://localhost:8091';
export const ORCHESTRATOR_API_BASE =
  import.meta.env.VITE_RIHA_ORCHESTRATOR_API_URL || 'http://localhost:8083';
export const CRITIC_API_BASE =
  import.meta.env.VITE_RIHA_CRITIC_API_URL || 'http://localhost:8085';

export class ProblemDetailError extends Error {
  public readonly problem: Rfc7807ProblemDetail;

  constructor(problem: Rfc7807ProblemDetail) {
    super(problem.detail || problem.title);
    this.problem = problem;
  }
}

async function handleResponse<T>(response: Response, endpoint: string): Promise<T> {
  if (!response.ok) {
    let parsed: Rfc7807ProblemDetail | null = null;
    try {
      const body = await response.json();
      if (body && (body.title || body.detail || body.status)) {
        parsed = {
          title: body.title || `${response.status} Service Unavailable - Live Market Feed Disconnected`,
          status: body.status || response.status,
          detail: body.detail || body.error || `Live upstream endpoint ${endpoint} returned HTTP ${response.status}`,
          type: body.type,
          instance: body.instance || endpoint,
          service: body.service,
          productId: body.productId || 'RIHA_STOCK_AI',
          upstreamService: body.upstreamService,
          provider: body.provider,
          ticker: body.ticker,
          zeroMockPolicyEnforced: body.zeroMockPolicyEnforced ?? true,
          timestamp: body.timestamp || new Date().toISOString(),
        };
      }
    } catch {
      // Fallback if response is not JSON
    }
    throw new ProblemDetailError(
      parsed || {
        title: '503 Service Unavailable - Live Market Feed Disconnected',
        status: response.status || 503,
        detail: `Live backend endpoint ${endpoint} is unreachable or disconnected (HTTP ${response.status}). Zero Mock Data Policy is strictly enforced.`,
        productId: 'RIHA_STOCK_AI',
        zeroMockPolicyEnforced: true,
        timestamp: new Date().toISOString(),
      }
    );
  }
  return response.json() as Promise<T>;
}

export async function fetchCommandStocks(params: {
  date?: string;
  algorithm?: string;
  signal?: string;
  search?: string;
}): Promise<Array<Record<string, any>>> {
  const qs = new URLSearchParams();
  if (params.date) qs.set('date', params.date);
  if (params.algorithm) qs.set('algorithm', params.algorithm);
  if (params.signal) qs.set('signal', params.signal);
  if (params.search) qs.set('search', params.search);
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/stocks?${qs.toString()}`;
  const res = await fetch(url);
  return handleResponse<Array<Record<string, any>>>(res, url);
}

export async function addStockToWatchlist(ticker: string): Promise<Record<string, any>> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/stocks`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker, runImmediateAnalysis: true }),
  });
  return handleResponse<Record<string, any>>(res, url);
}

export async function deleteStockFromWatchlist(ticker: string): Promise<Record<string, any>> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/stocks/${encodeURIComponent(ticker)}`;
  const res = await fetch(url, { method: 'DELETE' });
  return handleResponse<Record<string, any>>(res, url);
}

export async function triggerAnalyzeStockNow(ticker: string): Promise<Record<string, any>> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/stocks/${encodeURIComponent(ticker)}/analyze-now`;
  const res = await fetch(url, { method: 'POST' });
  return handleResponse<Record<string, any>>(res, url);
}

export async function fetchStockUnderneathAnalysis(ticker: string): Promise<Record<string, any>> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/stocks/${encodeURIComponent(ticker)}/underneath-analysis`;
  const res = await fetch(url);
  return handleResponse<Record<string, any>>(res, url);
}

export async function executeQuickTradeOrMode(payload: {
  ticker?: string;
  side?: 'BUY' | 'SELL';
  quantity?: number;
  executionMode?: string;
  autoTradeEnabled?: boolean;
}): Promise<Record<string, any>> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/trades/execute`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<Record<string, any>>(res, url);
}

export async function fetchExecutiveSummary(): Promise<Record<string, any>> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/summary/executive`;
  const res = await fetch(url);
  return handleResponse<Record<string, any>>(res, url);
}

export async function fetchMasterAuditSummary(window: string = 'ALL'): Promise<MasterAuditSummary> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/audit-summary?window=${encodeURIComponent(window)}`;
  try {
    const res = await fetch(url);
    return await handleResponse<MasterAuditSummary>(res, url);
  } catch (err) {
    if (err instanceof ProblemDetailError) throw err;
    throw new ProblemDetailError({
      title: '503 Service Unavailable - Live Market Feed Disconnected',
      status: 503,
      detail: `Cannot connect to riha-stock-ai-strategy-service at ${STRATEGY_API_BASE}: ${(err as Error).message}`,
      service: 'riha-stock-ai-strategy-service',
      productId: 'RIHA_STOCK_AI',
      zeroMockPolicyEnforced: true,
      timestamp: new Date().toISOString(),
    });
  }
}

export async function runTopStocksBatchScan(
  window: '1D' | '1H',
  strategyId?: string
): Promise<{
  batchScanId: string;
  timeWindow: string;
  autoTradeEnabled: boolean;
  autoTradeMode: string;
  stocksScannedCount: number;
  results: AiTradeAuditTrail[];
}> {
  const params = new URLSearchParams({ window });
  if (strategyId) params.set('strategyId', strategyId);
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/scanner/run?${params.toString()}`;
  try {
    const res = await fetch(url, { method: 'POST' });
    return await handleResponse(res, url);
  } catch (err) {
    if (err instanceof ProblemDetailError) throw err;
    throw new ProblemDetailError({
      title: '503 Service Unavailable - Live Market Feed Disconnected',
      status: 503,
      detail: `Failed to execute multi-stock ${window} DAG scan on ${STRATEGY_API_BASE}: ${(err as Error).message}`,
      service: 'riha-stock-ai-strategy-service',
      productId: 'RIHA_STOCK_AI',
      zeroMockPolicyEnforced: true,
      timestamp: new Date().toISOString(),
    });
  }
}

export async function fetchTopMoversDirect(window: '1D' | '1H'): Promise<LiveWatchlistQuote[]> {
  const url = `${MARKET_INGESTOR_API_BASE}/api/v1/market/top-movers?window=${encodeURIComponent(window)}`;
  try {
    const res = await fetch(url);
    return await handleResponse<LiveWatchlistQuote[]>(res, url);
  } catch (err) {
    if (err instanceof ProblemDetailError) throw err;
    throw new ProblemDetailError({
      title: '503 Service Unavailable - Live Market Feed Disconnected',
      status: 503,
      detail: `Live market top movers feed (${url}) is disconnected: ${(err as Error).message}`,
      service: 'riha-stock-ai-market-ingestor',
      productId: 'RIHA_STOCK_AI',
      zeroMockPolicyEnforced: true,
      timestamp: new Date().toISOString(),
    });
  }
}

export async function updateAutoTradeMode(autoTradeEnabled: boolean): Promise<{
  productId: string;
  autoTradeEnabled: boolean;
  mode: 'FULL_AUTO_MCP_EXECUTION' | 'RECOMMEND_ONLY';
  updatedAt: string;
}> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/auto-trade-mode`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ autoTradeEnabled }),
  });
  return handleResponse(res, url);
}

export async function executeOneClickRecommendation(auditId: string): Promise<AiTradeAuditTrail> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/recommendations/${encodeURIComponent(auditId)}/execute`;
  const res = await fetch(url, { method: 'POST' });
  return handleResponse<AiTradeAuditTrail>(res, url);
}

export async function fetchDecisions(ticker?: string): Promise<AiTradeDecision[]> {
  const query = ticker ? `?ticker=${encodeURIComponent(ticker)}` : '';
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/decisions${query}`;
  try {
    const res = await fetch(url);
    return await handleResponse<AiTradeDecision[]>(res, url);
  } catch (err) {
    if (err instanceof ProblemDetailError) throw err;
    throw new ProblemDetailError({
      title: '503 Service Unavailable - Live Market Feed Disconnected',
      status: 503,
      detail: `Cannot connect to riha-stock-ai-strategy-service at ${STRATEGY_API_BASE}: ${(err as Error).message}`,
      service: 'riha-stock-ai-strategy-service',
      productId: 'RIHA_STOCK_AI',
      zeroMockPolicyEnforced: true,
      timestamp: new Date().toISOString(),
    });
  }
}

export async function triggerImmediateEvaluation(
  ticker: string,
  strategyId?: string,
  promptVersionOverride?: string
): Promise<AiTradeDecision> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/evaluate`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker, strategyId, promptVersionOverride }),
    });
    return await handleResponse<AiTradeDecision>(res, url);
  } catch (err) {
    if (err instanceof ProblemDetailError) throw err;
    throw new ProblemDetailError({
      title: '503 Service Unavailable - Live Market Feed Disconnected',
      status: 503,
      detail: `Failed to trigger immediate AI evaluation for ${ticker} on ${STRATEGY_API_BASE}: ${(err as Error).message}`,
      service: 'riha-stock-ai-strategy-service',
      productId: 'RIHA_STOCK_AI',
      ticker,
      zeroMockPolicyEnforced: true,
      timestamp: new Date().toISOString(),
    });
  }
}

export async function fetchStrategies(): Promise<StrategyPromptBinding[]> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/strategies`;
  try {
    const res = await fetch(url);
    return await handleResponse<StrategyPromptBinding[]>(res, url);
  } catch (err) {
    if (err instanceof ProblemDetailError) throw err;
    throw new ProblemDetailError({
      title: '503 Service Unavailable - Strategy Coordinator Disconnected',
      status: 503,
      detail: `Unable to load strategy bindings from ${STRATEGY_API_BASE}: ${(err as Error).message}`,
      service: 'riha-stock-ai-strategy-service',
      productId: 'RIHA_STOCK_AI',
      zeroMockPolicyEnforced: true,
      timestamp: new Date().toISOString(),
    });
  }
}

export async function bindStrategyToPromptVersion(
  strategyId: string,
  promptName: string,
  boundSemanticVersion: string,
  lifecycleStatus: string
): Promise<StrategyPromptBinding> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/strategies/${encodeURIComponent(strategyId)}/bind-prompt`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ promptName, boundSemanticVersion, lifecycleStatus }),
  });
  return handleResponse<StrategyPromptBinding>(res, url);
}

export async function fetchLiveWatchlist(): Promise<LiveWatchlistQuote[]> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/watchlist`;
  try {
    const res = await fetch(url);
    return await handleResponse<LiveWatchlistQuote[]>(res, url);
  } catch (err) {
    if (err instanceof ProblemDetailError) throw err;
    throw new ProblemDetailError({
      title: '503 Service Unavailable - Live Market Feed Disconnected',
      status: 503,
      detail: `Live watchlist stream from riha-stock-ai-market-ingestor via ${STRATEGY_API_BASE} is disconnected: ${(err as Error).message}`,
      service: 'riha-stock-ai-market-ingestor',
      productId: 'RIHA_STOCK_AI',
      zeroMockPolicyEnforced: true,
      timestamp: new Date().toISOString(),
    });
  }
}

export async function fetchLivePortfolio(): Promise<RobinhoodPortfolioSnapshot> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/portfolio`;
  try {
    const res = await fetch(url);
    return await handleResponse<RobinhoodPortfolioSnapshot>(res, url);
  } catch (err) {
    if (err instanceof ProblemDetailError) throw err;
    throw new ProblemDetailError({
      title: '503 Service Unavailable - Live Market Feed Disconnected',
      status: 503,
      detail: `Live Robinhood brokerage stream via ${STRATEGY_API_BASE} is disconnected: ${(err as Error).message}`,
      service: 'riha-stock-ai-robinhood-mcp-server',
      productId: 'RIHA_STOCK_AI',
      zeroMockPolicyEnforced: true,
      timestamp: new Date().toISOString(),
    });
  }
}

export async function fetchCriticRiskGuardrails(): Promise<CriticRiskGuardrails> {
  const url = `${CRITIC_API_BASE}/api/v1/critic/test-harness/risk-guardrails/RIHA_STOCK_AI`;
  try {
    const res = await fetch(url);
    return await handleResponse<CriticRiskGuardrails>(res, url);
  } catch (err) {
    if (err instanceof ProblemDetailError) throw err;
    throw new ProblemDetailError({
      title: '503 Service Unavailable - Critic Engine Disconnected',
      status: 503,
      detail: `Unable to query deterministic SpEL risk guardrails from riha-critic-engine (${CRITIC_API_BASE}): ${(err as Error).message}`,
      service: 'riha-critic-engine',
      productId: 'RIHA_STOCK_AI',
      zeroMockPolicyEnforced: true,
      timestamp: new Date().toISOString(),
    });
  }
}

export async function updateCriticRiskGuardrails(updates: {
  maxPositionSizeUsd: number;
  maxDailyDrawdownLimitPct: number;
  convergenceThreshold?: number;
}): Promise<CriticRiskGuardrails> {
  const url = `${CRITIC_API_BASE}/api/v1/critic/test-harness/risk-guardrails/RIHA_STOCK_AI`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return handleResponse<CriticRiskGuardrails>(res, url);
}

export async function fetchPersonalizedAccountSummary(): Promise<PersonalizedAccountSummary> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/portfolio/account-summary`;
  const res = await fetch(url);
  return handleResponse<PersonalizedAccountSummary>(res, url);
}

export async function fetchOwnedPositions(): Promise<OwnedStockPosition[]> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/portfolio/positions`;
  const res = await fetch(url);
  return handleResponse<OwnedStockPosition[]>(res, url);
}

export async function submitPortfolioOrder(order: OrderSubmissionRequest): Promise<Record<string, any>> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/portfolio/orders`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order),
  });
  return handleResponse<Record<string, any>>(res, url);
}

export async function fetchTrendingStocks(
  filter: string = 'TOP_GAINERS_DAY',
  search?: string
): Promise<TrendingStockItem[]> {
  const qs = new URLSearchParams();
  if (filter) qs.set('filter', filter);
  if (search) qs.set('search', search);
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/trending?${qs.toString()}`;
  const res = await fetch(url);
  return handleResponse<TrendingStockItem[]>(res, url);
}

export async function fetchTechnicalFindings(ticker: string): Promise<TechnicalFindings> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/stocks/${encodeURIComponent(ticker)}/findings/technical`;
  const res = await fetch(url);
  return handleResponse<TechnicalFindings>(res, url);
}

export async function fetchCriticFindings(ticker: string): Promise<CriticFindings> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/stocks/${encodeURIComponent(ticker)}/findings/critic`;
  const res = await fetch(url);
  return handleResponse<CriticFindings>(res, url);
}

export async function fetchSecAndMemoryFindings(ticker: string): Promise<SecMemoryFindings> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/stocks/${encodeURIComponent(ticker)}/findings/sec-memory`;
  const res = await fetch(url);
  return handleResponse<SecMemoryFindings>(res, url);
}

export async function fetchStrategyDetails(ticker: string): Promise<StrategyDetails> {
  const url = `${STRATEGY_API_BASE}/api/v1/stock-ai/stocks/${encodeURIComponent(ticker)}/findings/strategy-details`;
  const res = await fetch(url);
  return handleResponse<StrategyDetails>(res, url);
}
