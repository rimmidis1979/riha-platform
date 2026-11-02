export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_LOSS';
export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus = 'FILLED' | 'PENDING' | 'CANCELLED';
export type Timeframe = '1D' | '1W' | '1M' | '1Y' | 'ALL';

export interface Holding {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  equity: number;
  totalGain: number;
  totalGainPercent: number;
  dayGain: number;
  dayGainPercent: number;
  allocationPercent: number;
  sector: string;
}

export interface TradeOrder {
  id: string;
  symbol: string;
  companyName: string;
  side: OrderSide;
  orderType: OrderType;
  shares: number;
  executionPrice: number;
  totalValue: number;
  timestamp: string;
  status: OrderStatus;
  notes?: string;
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
}
