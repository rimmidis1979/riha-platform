export type SentimentType = 'BULLISH' | 'NEUTRAL' | 'BEARISH';
export type AiRecommendation = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SPECULATIVE_BUY';
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
  aiConfidence: number; // percentage
  socialSentimentScore: number; // e.g. 88% bullish
  socialMentions24h: number;
  recentNews: NewsCatalyst;
  recentFiling?: SecFiling;
  isPersonalized: boolean; // Pinned to user's personalized selection
  tags: string[]; // e.g. ["AI Hardware", "Quantum", "Breakout"]
}

export interface TrendingFilters {
  searchQuery: string;
  minPrice: number;
  maxPrice: number;
  sentiment: 'ALL' | SentimentType;
  filingType: 'ALL' | FilingType;
  aiPrediction: 'ALL' | AiRecommendation;
  sector: string;
  onlyPersonalized: boolean;
}
