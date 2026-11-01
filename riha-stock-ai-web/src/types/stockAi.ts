export interface Rfc7807ProblemDetail {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  service?: string;
  productId?: string;
  upstreamService?: string;
  provider?: string;
  ticker?: string;
  zeroMockPolicyEnforced?: boolean;
  timestamp?: string;
}

export interface AiTradeDecision {
  decisionId: string;
  workflowInstanceId: string;
  ticker: string;
  strategyName: string;
  promptVersionUsed: string;
  liveMarketSnapshotJson: string;
  agentReasoningJson: string;
  criticSpelPassed: boolean;
  criticSemanticScore: number;
  criticFeedback: string;
  finalAction:
    | 'EXECUTED_BUY'
    | 'EXECUTED_SELL'
    | 'AUTO_EXECUTED_BUY'
    | 'AUTO_EXECUTED_SELL'
    | 'RECOMMENDED_AWAITING_ONE_CLICK_APPROVAL'
    | 'HOLD'
    | 'HOLD_NO_ACTION'
    | 'BLOCKED_BY_CRITIC';
  brokerageOrderId: string | null;
  executedPrice: number | null;
  quantity: number | null;
  realizedPnl: number | null;
  decidedAt: string;
}

export interface AiTradeAuditTrail {
  auditId: string;
  batchScanId: string;
  timeWindow: '1D' | '1H';
  workflowInstanceId: string;
  decisionId: string;
  ticker: string;
  strategyApplied: string;
  promptVersion: string;
  dagNodeTimingsMsJson: string;
  technicalSnapshotJson: string;
  secCatalystSnapshotJson?: string;
  aiRecommendation: 'BUY' | 'SELL' | 'HOLD';
  limitPrice: number;
  stopLossPrice: number;
  takeProfitPrice: number;
  quantity: number;
  aiReasoningSummary: string;
  criticSpelVerdict: string;
  criticConvergenceScore: number;
  criticRemediationReason: string;
  executionStatus:
    | 'AUTO_EXECUTED_BUY'
    | 'AUTO_EXECUTED_SELL'
    | 'RECOMMENDED_AWAITING_ONE_CLICK_APPROVAL'
    | 'BLOCKED_BY_CRITIC'
    | 'HOLD_NO_ACTION';
  robinhoodOrderId: string | null;
  fillPrice: number | null;
  realizedUnrealizedPnl: number;
  totalTokensUsed: number;
  estimatedTokenCostUsd: number;
  rawEventLineageJson: string;
  auditedAt: string;
}

export interface MasterAuditSummary {
  productId: string;
  timeWindowFilter: string;
  autoTradeEnabled: boolean;
  autoTradeMode: 'FULL_AUTO_MCP_EXECUTION' | 'RECOMMEND_ONLY';
  totalStocksScanned: number;
  totalBuySignals: number;
  totalSellSignals: number;
  totalHoldSignals: number;
  criticApprovals: number;
  criticRejections: number;
  autoExecutedOrders: number;
  awaitingApprovalCount: number;
  realizedUnrealizedPnlUsd: number;
  totalTokensUsed: number;
  totalTokenCostUsd: number;
  scannerMatrixState: Array<Record<string, unknown>>;
  auditTrail: AiTradeAuditTrail[];
  generatedAt: string;
}

export interface StrategyPromptBinding {
  strategyId: string;
  strategyName: string;
  description: string;
  promptName: string;
  boundSemanticVersion: string;
  lifecycleStatus: string;
  goalContractId: string;
  topologyId: string;
  active: boolean;
  updatedAt: string;
}

export interface LiveWatchlistQuote {
  ticker: string;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  spreadBps: number;
  vwap: number;
  rsi14: number;
  relativeVolume: number;
  shortBorrowFeeRate: number;
  floatSize: number;
  dayVolume: number;
  strategySignalDetected: string;
  streamSource: string;
  capturedAt: string;
}

export interface RobinhoodEquityPosition {
  ticker: string;
  quantity: number;
  averageCostPrice: number;
  liveMarketPrice: number;
  marketValueUsd: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number;
}

export interface RobinhoodPortfolioSnapshot {
  accountNumber: string;
  liveCashBalance: number;
  buyingPowerUsd: number;
  unsettledFundsUsd: number;
  totalEquityUsd: number;
  unrealizedPnlUsd: number;
  realizedPnlUsd: number;
  currentDailyDrawdownPct: number;
  openPositions: RobinhoodEquityPosition[];
  retrievedAt: string;
}

export interface CriticRiskGuardrails {
  productId: string;
  contractId: string;
  maxPositionSizeUsd: number;
  maxDailyDrawdownLimitPct: number;
  currentDailyDrawdownPct: number;
  convergenceThreshold: number;
  spelRules: string[];
  updatedAt: string;
}
