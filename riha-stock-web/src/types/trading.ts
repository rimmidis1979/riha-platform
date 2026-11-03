export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_LOSS';
export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus = 'FILLED' | 'PENDING' | 'CANCELLED';
export type Timeframe = '1D' | '1W' | '1M' | '1Y' | 'ALL';

export interface Holding {
  symbol: string;
  name: string;
  companyName?: string;
  shares: number;
  avgCost: number;
  avgPrice?: number;
  currentPrice: number;
  equity: number;
  totalGain: number;
  totalGainPercent: number;
  dayGain: number;
  dayGainPercent: number;
  totalReturn?: number;
  totalReturnPercent?: number;
  dayReturn?: number;
  dayReturnPercent?: number;
  allocationPercent: number;
  sector?: string;
  broker?: 'ROBINHOOD' | 'CHARLES_SCHWAB';
  volume?: number;
  avgVolume?: number;
  relativeVolume?: number;
  volumeTrend?: 'SURGE' | 'ACCUMULATION' | 'DISTRIBUTION' | 'DRY_UP' | 'NORMAL';
  volumeChangePct?: number;
  volumePeriod?: '5D' | '10D' | '20D' | '30D';
  runStrategicLoop?: boolean;
  executionMode?: 'PAPERLESS' | 'ACTUAL';
  latestRecommendation?: 'BUY' | 'SELL' | 'HOLD';
  strategyConfidenceScore?: number;
  strategyDiagnosisSummary?: string;
  targetProfitMarginPct?: number;
  stopLossMarginPct?: number;
  autoBuyEnabled?: boolean;
  autoSellEnabled?: boolean;
  maxQuantity?: number;
}

export interface TradeOrder {
  id: string;
  symbol: string;
  companyName: string;
  side: OrderSide;
  orderType: OrderType;
  type?: OrderType;
  shares: number;
  executionPrice: number;
  price?: number;
  totalValue: number;
  timestamp: string;
  status: OrderStatus;
  notes?: string;
  broker?: 'ROBINHOOD' | 'CHARLES_SCHWAB';
  executionMode?: 'PAPERLESS' | 'ACTUAL';
  origin?: 'RIHA_APP' | 'ROBINHOOD_DIRECT' | 'SCHWAB_DIRECT';
  unrealizedPnlUsd?: number;
  realizedPnlUsd?: number;
  recommendationLabel?: string;
}

export interface PerformanceDataPoint {
  timestamp: string;
  label: string;
  portfolioValue: number;
  benchmarkValue: number; // S&P 500 comparison
  netGain: number;
  percentChange: number;
}

export interface PortfolioSummary {
  totalEquity: number;
  cashBalance: number;
  totalPortfolioValue: number;
  todayGain: number;
  todayGainPercent: number;
  allTimeGain: number;
  allTimeGainPercent: number;
  holdingsCount: number;
  buyingPower?: number;
  todayReturn?: number;
  todayReturnPercent?: number;
  totalReturn?: number;
  totalReturnPercent?: number;
}

export interface StockTradeTransaction {
  id: string;
  decisionId?: string;
  workflowInstanceId?: string;
  ticker: string;
  companyName?: string;
  side: 'BUY' | 'SELL';
  executionMode: string;
  strategyName: string;
  promptVersion?: string;
  quantity: number;
  orderPrice: number;
  executedFillPrice?: number;
  stopLossPrice?: number;
  predictedTargetPrice?: number;
  realizedProfitLossUsd?: number;
  realizedProfitLossPct?: number;
  criticScore?: number;
  robinhoodOrderId?: string;
  status: string;
  executedAt: string;
}

export interface AutoStrategyItem {
  ticker: string;
  tradingDate?: string;
  activeMonitoring: boolean;
  discoveryAlgorithm?: string;
  latestLivePrice?: number;
  dayChangePct?: number;
  latestRecommendation?: string;
  latestPredictedTarget?: number;
  predictedGainPct?: number;
  latestStopLossPrice?: number;
  confidenceScore?: number;
  criticVerdict?: string;
  ownedShares?: number;
  costBasis?: number;
  targetProfitMarginPct?: number;
  stopLossMarginPct?: number;
  executionMode?: 'PAPERLESS' | 'ACTUAL';
  autoBuyEnabled?: boolean;
  autoSellEnabled?: boolean;
  updatedAt?: string;
}

export interface StrategyHistoryItem {
  auditId: string;
  batchScanId?: string;
  timeWindow?: string;
  workflowInstanceId?: string;
  ticker: string;
  strategyApplied: string;
  promptVersion?: string;
  aiRecommendation: 'BUY' | 'SELL' | 'HOLD';
  limitPrice?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  quantity?: number;
  aiReasoningSummary?: string;
  criticSpelVerdict: string;
  criticConvergenceScore?: number;
  criticRemediationReason?: string;
  executionStatus: string;
  fillPrice?: number;
  realizedUnrealizedPnl?: number;
  auditedAt: string;
}

export interface PlatformPerformanceSummary {
  realizedPnlUsd: number;
  unrealizedPnlUsd: number;
  netPnlUsd: number;
  winRatePct: number;
  totalTradesCount: number;
  winningTradesCount: number;
  losingTradesCount: number;
  totalBuysCount: number;
  totalSellsCount: number;
  totalBuyVolumeUsd: number;
  totalSellVolumeUsd: number;
  totalVolumeTradedUsd: number;
  activePositionsCount: number;
  generatedAt: string;
}
