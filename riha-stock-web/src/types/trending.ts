export type SentimentType = 'BULLISH' | 'NEUTRAL' | 'BEARISH';
export type AiRecommendation = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'NO_ACTION' | 'SPECULATIVE_BUY';
export type FilingType = '10-K' | '10-Q' | '8-K' | 'FORM 4' | '13F';

export interface NewsCatalyst {
  id: string;
  headline: string;
  source: string;
  publishedAt: string;
  sentiment: SentimentType;
  impactScore: number; // 1-100
  summary: string;
  url?: string;
}

export interface SecFiling {
  id: string;
  formType: FilingType;
  filingDate: string;
  title: string;
  significance: 'HIGH' | 'MEDIUM' | 'ROUTINE';
  insiderActivity?: string; // e.g. "CEO bought 50,000 shares"
}

export interface MomentumPromptDecision {
  action: 'BUY' | 'SELL' | 'HOLD' | 'NO_ACTION';
  ticker: string;
  confidence: number; // 0.0 to 1.0
  entry_price: number;
  stop_loss: number;
  target_price: number;
  order_type: string; // e.g. 'LIMIT', 'MARKET'
  quantity: number;
  catalyst: string;
  reasoning: string;
  evaluatedAt: string;
  ragPlaybookUsed?: string;
}

export interface TrendingStock {
  symbol: string;
  companyName: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  sector: string;
  momentumScore: number; // 1 to 100
  aiPrediction: AiRecommendation;
  aiConfidence: number; // percentage (0-100)
  socialSentimentScore: number; // e.g. 88% bullish
  socialMentions24h: number;
  vwap?: number;
  relativeVolume?: number;
  shortBorrowFeePct?: number;
  recentNews?: NewsCatalyst;
  recentFiling?: SecFiling;
  isPersonalized: boolean; // Pinned to user's personalized selection
  tags: string[]; // e.g. ["Momentum", "AI Breakout", "RVOL"]
  promptDecision?: MomentumPromptDecision;
}

export interface TrendingFilters {
  searchQuery: string;
  minPrice: number; // 0.00 to 1500.00
  maxPrice: number; // 0.00 to 1500.00
  limit: number;    // 10, 25, 50, 100 (Default: 25)
  sentiment: 'ALL' | SentimentType;
  filingType: 'ALL' | FilingType;
  aiPrediction: 'ALL' | AiRecommendation;
  sector: string;
  onlyPersonalized: boolean;
  algorithm: 'ALL' | 'TOP_GAINERS_DAY' | 'RVOL_BREAKOUT' | 'SHORT_SQUEEZE_MICROCAP' | 'VWAP_RECLAIM_MOMENTUM' | 'HIGH_CONVICTION_MULTI_FACTOR';
}
