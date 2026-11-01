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

export interface PersonalizedAccountSummary {
  netAccountEquityUsd: number;
  settledCashUsd: number;
  liveBuyingPowerUsd: number;
  accountType: 'CASH' | 'MARGIN';
  unrealizedOpenPnlUsd: number;
  unrealizedOpenPnlPct: number;
  todayTotalProfitUsd: number;
  todayTotalProfitPct: number;
  overallCumulativeProfitUsd: number;
  overallCumulativeProfitPct: number;
  activePositionsCount: number;
  capitalDeployedPct: number;
  winRatePct: number;
  profitFactor: number;
  currentDailyDrawdownPct: number;
  maxDailyDrawdownLimitPct: number;
  autonomousProtectionEnabled: boolean;
  brokerageConnected: boolean;
  brokerageStatus: string;
  brokerageNote: string;
  intradayPnlSparkline: Array<{ time: string; pnl: number }>;
  generatedAt: string;
}

export interface OwnedStockPosition {
  ticker: string;
  companyName: string;
  ownedQuantity: number;
  totalPositionValueUsd: number;
  averageCostPrice: number;
  liveMarketPrice: number;
  priceDeltaUsd: number;
  priceChangePct: number;
  unrealizedPnlUsd: number;
  unrealizedPnlPct: number;
  todayPnlUsd: number;
  todayPnlPct: number;
  strategyApplied: string;
  promptVersion: string;
  predictedTargetPrice: number;
  stopLossPrice: number;
  riskRewardRatio: number;
  confidenceScore: number;
  findingsReviewStatus: {
    technical: string;
    critic: string;
    secMemory: string;
  };
  lastEvaluatedAt: string;
}

export interface TrendingStockItem {
  id?: string;
  ticker: string;
  companyName: string;
  livePrice: number;
  dayChangePct: number;
  relativeVolume: number;
  floatSize?: string;
  shortBorrowFeePct?: number;
  discoveryAlgorithm: string;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  predictedTargetPrice: number;
  predictedGainPct?: number;
  stopLossPrice: number;
  riskRewardRatio: number;
  confidenceScore: number;
  criticVerdict: string;
  isOwned: boolean;
  ownedQuantity: number;
  findingsLinks: {
    technical: string;
    critic: string;
    secMemory: string;
  };
}

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalFindings {
  ticker: string;
  companyName: string;
  livePrice: number;
  vwap: number;
  rsi14: number;
  macd: { macd: number; signal: number; histogram: number };
  relativeVolume: number;
  orderFlowImbalance: number;
  shortBorrowFeePct: number;
  freeFloatShares: string;
  shortInterestPct: number;
  strategyApplied: string;
  confidenceScore: number;
  recommendation: string;
  predictedTargetPrice: number;
  stopLossPrice: number;
  riskRewardRatio: number;
  candlesByTimeframe: {
    '1m': CandleData[];
    '5m': CandleData[];
    '15m': CandleData[];
    '1h': CandleData[];
    '1D': CandleData[];
  };
  executionLog: Array<{ timestamp: string; event: string; status: string }>;
  isOwned: boolean;
  ownedQuantity: number;
  evaluatedAt: string;
}

export interface CriticPolicyItem {
  ruleId: string;
  name: string;
  expression: string;
  threshold: string;
  evaluatedValue: any;
  status: 'PASSED' | 'FAILED';
}

export interface CriticFindings {
  ticker: string;
  companyName: string;
  criticVerdict: 'APPROVED' | 'REJECTED' | 'BLOCKED';
  deterministicSpelPassed: boolean;
  semanticConvergenceScore: number;
  confidenceScore: number;
  approvalToken: string;
  remediationFeedback: string;
  aiReasoningTranscript: string;
  policiesEvaluated: CriticPolicyItem[];
  isOwned: boolean;
  ownedQuantity: number;
  evaluatedAt: string;
}

export interface SecEdgarFiling {
  filingType: string;
  filedDate: string;
  description: string;
  impact: string;
}

export interface EpisodicMemoryRagItem {
  similarityScore: number;
  historicalTicker: string;
  historicalDate: string;
  setupType: string;
  outcome: 'WIN' | 'LOSS';
  returnPct: string;
  holdingPeriod: string;
}

export interface SecMemoryFindings {
  ticker: string;
  companyName: string;
  dilutionRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  dilutionRiskScore: number;
  activeAtmFacility: boolean;
  shelfRegistrationS3: string;
  cashRunwayMonths: number;
  secEdgarFilings: SecEdgarFiling[];
  episodicMemoryRag: EpisodicMemoryRagItem[];
  isOwned: boolean;
  ownedQuantity: number;
  evaluatedAt: string;
}

export interface StrategyDetails {
  ticker: string;
  strategyId: string;
  strategyName: string;
  promptVersion: string;
  vchHubPromptId: string;
  consensusWeights: Record<string, number>;
  rulesList: string[];
  modelProvider: string;
}

export interface OrderSubmissionRequest {
  ticker: string;
  side: 'BUY' | 'SELL';
  orderType: 'LIMIT' | 'MARKET';
  quantity: number;
  limitPrice?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  executionMode?: string;
}

export interface OrderTicketParams {
  ticker: string;
  initialSide: 'BUY' | 'SELL';
  initialType?: 'LIMIT' | 'MARKET';
  price: number;
  targetPrice?: number;
  stopLossPrice?: number;
  ownedQuantity: number;
}
