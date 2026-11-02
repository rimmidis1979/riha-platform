export type StrategyCategoryType =
  | 'technical'
  | 'fundamental'
  | 'regulatory_sec'
  | 'market_structure'
  | 'sentiment_macro'
  | 'critic_risk';

export type StrategySignal =
  | 'STRONG_BUY'
  | 'BUY'
  | 'NEUTRAL'
  | 'HOLD'
  | 'SELL'
  | 'RISK_ALERT'
  | 'PASS'
  | 'APPROVED';

export type StrategyOutcome =
  | 'STRONG_BULLISH'
  | 'BULLISH'
  | 'NEUTRAL'
  | 'BEARISH'
  | 'APPROVED'
  | 'HIGH_RISK';

export interface StrategyEvaluationItem {
  id: string;
  name: string;
  category: StrategyCategoryType;
  signal: StrategySignal;
  score: number; // 0 to 100
  isApplicable: boolean;
  statusLabel: 'APPLICABLE' | 'NOT_APPLICABLE';
  shortDescription: string;
  reasonWhy: string; // "Short description of it is applicable or not and why"
  keyMetric: string;
  ruleCondition: string;
  timeframe?: string;
}

export interface StrategyCategorySummary {
  category: StrategyCategoryType;
  title: string;
  subtitle: string;
  weightPercent: number; // e.g. 25
  score: number; // 0 to 100
  finalOutcome: StrategyOutcome;
  applicableCount: number;
  totalCount: number;
  summaryVerdict: string;
  keyDrivers: string[];
  strategies: StrategyEvaluationItem[];
}

export interface ComprehensiveStrategyReport {
  ticker: string;
  companyName: string;
  price: number;
  dayChangePct: number;
  volume: number;
  relativeVolume: number;
  marketCap: string;
  peRatio: number;
  sector: string;
  overallScore: number; // 0 to 100
  overallOutcome: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'AVOID';
  consensusRating: string;
  confidencePct: number;
  applicableCount: number;
  totalStrategiesCount: number;
  categories: StrategyCategorySummary[];
  scoreFormula: string;
  evaluatedAt: string;
}
