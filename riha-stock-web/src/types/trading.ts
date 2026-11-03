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
  runStrategicLoop?: boolean;
  executionMode?: 'PAPERLESS' | 'ACTUAL';
  latestRecommendation?: 'BUY' | 'SELL' | 'HOLD';
  strategyConfidenceScore?: number;
  strategyDiagnosisSummary?: string;
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
