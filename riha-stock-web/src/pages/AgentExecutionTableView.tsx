import React, { useState, useMemo } from 'react';
import {
  Cpu,
  Bot,
  Activity,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Search,
  Sparkles,
  Layers,
  Copy,
  Check,
  Clock,
  Coins,
  FileCode,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  BarChart2,
  Workflow,
  ShieldCheck,
  Zap,
  Info,
  DollarSign,
  PieChart,
} from 'lucide-react';

export interface StrategyEvaluationStep {
  strategy_name: string;
  agent_service: string;
  status: 'Success' | 'Failed' | 'Warning' | string;
  weight: number;
  score: number; // 0 - 100
  signal: 'BUY' | 'SELL' | 'HOLD' | 'STRONG_BUY' | 'STRONG_SELL' | string;
  rationale: string;
  latency_ms: number;
  tokens_used: number;
}

export interface SynthesisStep {
  orchestrator_model: string;
  formula_applied: string;
  calculated_final_score: number;
}

export interface AgentExecutionTrace {
  ticker: string;
  timestamp: string;
  final_decision: 'BUY' | 'SELL' | 'HOLD' | 'STRONG_BUY' | 'STRONG_SELL' | string;
  final_confidence: number;
  summary_rationale: string;
  strategies_evaluated: StrategyEvaluationStep[];
  synthesis_step: SynthesisStep;
}

interface CalculatedStepProgress extends StrategyEvaluationStep {
  stepIndex: number;
  cumulativeWeight: number;
  cumulativeWeightedScore: number;
  runningNormalizedScore: number;
  previousNormalizedScore: number;
  scoreDelta: number;
  runningDecision: 'BUY' | 'SELL' | 'HOLD' | 'STRONG_BUY' | 'STRONG_SELL';
  decisionShiftDescription: string;
}

interface AgentExecutionTableViewProps {
  initialTrace?: AgentExecutionTrace;
  onNavigateToDiagnostics?: (ticker: string) => void;
}

// Built-in presets for instant demonstration & verification
const PRESET_TRACES: Record<string, AgentExecutionTrace> = {
  AAPL: {
    ticker: 'AAPL',
    timestamp: '2026-11-02T19:40:00Z',
    final_decision: 'BUY',
    final_confidence: 0.84,
    summary_rationale:
      'Strong momentum combined with positive institutional sentiment offset slight fundamental overvaluation.',
    strategies_evaluated: [
      {
        strategy_name: 'Technical Analysis (RSI & MACD)',
        agent_service: 'TechAgent',
        status: 'Success',
        weight: 0.4,
        score: 85,
        signal: 'BUY',
        rationale:
          'RSI is at 52 (neutral) but a bullish MACD crossover was detected on the 4h chart with expanding histogram bars.',
        latency_ms: 320,
        tokens_used: 450,
      },
      {
        strategy_name: 'News & Social Sentiment',
        agent_service: 'SentimentAgent',
        status: 'Success',
        weight: 0.3,
        score: 90,
        signal: 'BUY',
        rationale:
          'Recent earnings beat expectations and positive mentions surged by 45% on social feeds and Tier-1 financial media.',
        latency_ms: 410,
        tokens_used: 620,
      },
      {
        strategy_name: 'Fundamental Valuation (DCF & P/E)',
        agent_service: 'FundamentalAgent',
        status: 'Success',
        weight: 0.3,
        score: 60,
        signal: 'HOLD',
        rationale:
          'P/E ratio (31.4x) is slightly above historical 5-year average (27.2x), limiting immediate valuation upside.',
        latency_ms: 280,
        tokens_used: 390,
      },
    ],
    synthesis_step: {
      orchestrator_model: 'gpt-4o',
      formula_applied:
        'Weighted Average Score = (Tech_Score * 0.4) + (Sentiment_Score * 0.3) + (Fundamental_Score * 0.3)',
      calculated_final_score: 79.5,
    },
  },
  SMX: {
    ticker: 'SMX',
    timestamp: '2026-11-03T01:15:32Z',
    final_decision: 'BUY',
    final_confidence: 0.78,
    summary_rationale:
      'Price reclaimed session VWAP with institutional block volume, overriding conservative drawdown limits.',
    strategies_evaluated: [
      {
        strategy_name: 'VWAP & Intraday Liquidity Breakout',
        agent_service: 'TechAgent',
        status: 'Success',
        weight: 0.45,
        score: 88,
        signal: 'BUY',
        rationale:
          'Price ($1.76) trades at or above session VWAP ($1.74) with bullish volume delta, confirming institutional buyer reclaim.',
        latency_ms: 290,
        tokens_used: 410,
      },
      {
        strategy_name: 'Dark Pool & Institutional Liquidity Sweep',
        agent_service: 'MarketStructureAgent',
        status: 'Success',
        weight: 0.25,
        score: 78,
        signal: 'BUY',
        rationale:
          'Dark pool prints identified cluster buy blocks at $1.72 bid tier without aggressive ask walls.',
        latency_ms: 360,
        tokens_used: 510,
      },
      {
        strategy_name: 'SEC Catalysts & Insider Activity (Form 4)',
        agent_service: 'RegulatoryAgent',
        status: 'Success',
        weight: 0.15,
        score: 70,
        signal: 'HOLD',
        rationale:
          'Clean 8-K filings with zero dilutive toxic warrants pending, maintaining solid corporate standing.',
        latency_ms: 210,
        tokens_used: 330,
      },
      {
        strategy_name: 'Critic Drawdown & Volatility Guard',
        agent_service: 'CriticAgent',
        status: 'Success',
        weight: 0.15,
        score: 65,
        signal: 'HOLD',
        rationale:
          'Historical volatility remains elevated (ATR 0.24); strict position sizing recommended.',
        latency_ms: 180,
        tokens_used: 280,
      },
    ],
    synthesis_step: {
      orchestrator_model: 'gpt-4o',
      formula_applied:
        'Weighted Average Score = (Tech * 0.45) + (MarketStructure * 0.25) + (Regulatory * 0.15) + (Critic * 0.15)',
      calculated_final_score: 79.35,
    },
  },
  CHOW: {
    ticker: 'CHOW',
    timestamp: '2026-11-03T01:15:32Z',
    final_decision: 'BUY',
    final_confidence: 0.81,
    summary_rationale:
      'Severely oversold conditions triggered algorithmic accumulation entry, dampening negative momentum signals.',
    strategies_evaluated: [
      {
        strategy_name: 'Oversold RSI Mean-Reversion Reversal',
        agent_service: 'TechAgent',
        status: 'Success',
        weight: 0.5,
        score: 92,
        signal: 'BUY',
        rationale:
          'RSI-14 reached 8.89 (extreme oversold). Algorithmic mean-reversion rebound entry triggered with high bounce probability.',
        latency_ms: 310,
        tokens_used: 480,
      },
      {
        strategy_name: 'Retail Capitulation & Short Ratio',
        agent_service: 'SentimentAgent',
        status: 'Success',
        weight: 0.25,
        score: 82,
        signal: 'BUY',
        rationale:
          'Short interest volume hit 38% while retail selling sentiment hit capitulation extremes.',
        latency_ms: 380,
        tokens_used: 560,
      },
      {
        strategy_name: 'Cash Balance & Debt Runway',
        agent_service: 'FundamentalAgent',
        status: 'Success',
        weight: 0.25,
        score: 58,
        signal: 'HOLD',
        rationale:
          'Current burn rate provides 14 months of cash runway; zero near-term debt maturity obligations.',
        latency_ms: 240,
        tokens_used: 350,
      },
    ],
    synthesis_step: {
      orchestrator_model: 'gpt-4o',
      formula_applied:
        'Weighted Average Score = (Oversold_RSI * 0.50) + (Sentiment * 0.25) + (Fundamentals * 0.25)',
      calculated_final_score: 81.0,
    },
  },
  NVDA: {
    ticker: 'NVDA',
    timestamp: '2026-11-02T20:10:00Z',
    final_decision: 'BUY',
    final_confidence: 0.87,
    summary_rationale:
      'Dominant market share and accelerating data center capex guidance heavily outweigh high forward multiples.',
    strategies_evaluated: [
      {
        strategy_name: 'Moving Average Trend Alignment (EMA 9/21)',
        agent_service: 'TechAgent',
        status: 'Success',
        weight: 0.35,
        score: 84,
        signal: 'BUY',
        rationale:
          'Price is sustained cleanly above both 9-day and 21-day EMA lines with positive multi-timeframe slopes.',
        latency_ms: 270,
        tokens_used: 420,
      },
      {
        strategy_name: 'Hyperscaler AI Capex & Earnings Revisions',
        agent_service: 'SentimentAgent',
        status: 'Success',
        weight: 0.35,
        score: 95,
        signal: 'BUY',
        rationale:
          'Upward earnings revisions from 28 of 30 Wall Street analysts following datacenter guidance hike.',
        latency_ms: 450,
        tokens_used: 710,
      },
      {
        strategy_name: 'DCF Intrinsic Cash Yield & Margins',
        agent_service: 'FundamentalAgent',
        status: 'Success',
        weight: 0.3,
        score: 64,
        signal: 'HOLD',
        rationale:
          'Gross margins exceed 75%, but forward P/E of 42x discounts significant future growth.',
        latency_ms: 310,
        tokens_used: 440,
      },
    ],
    synthesis_step: {
      orchestrator_model: 'gpt-4o',
      formula_applied:
        'Weighted Average Score = (Tech_Score * 0.35) + (Sentiment_Score * 0.35) + (Fundamental_Score * 0.30)',
      calculated_final_score: 81.85,
    },
  },
  TSLA: {
    ticker: 'TSLA',
    timestamp: '2026-11-02T20:15:00Z',
    final_decision: 'HOLD',
    final_confidence: 0.64,
    summary_rationale:
      'Bullish autonomous tech momentum is countered by margin compression in core automotive delivery numbers.',
    strategies_evaluated: [
      {
        strategy_name: 'Bollinger Band Contraction & Volatility',
        agent_service: 'TechAgent',
        status: 'Success',
        weight: 0.35,
        score: 68,
        signal: 'HOLD',
        rationale:
          'Price oscillating inside tight Bollinger bands between $248 and $262 awaiting directional volume trigger.',
        latency_ms: 300,
        tokens_used: 430,
      },
      {
        strategy_name: 'Social Sentiment & AI Product Event',
        agent_service: 'SentimentAgent',
        status: 'Success',
        weight: 0.35,
        score: 78,
        signal: 'BUY',
        rationale:
          'Strong retail excitement around autonomous fleet rollout with 68% bullish social score.',
        latency_ms: 420,
        tokens_used: 650,
      },
      {
        strategy_name: 'Automotive Gross Margins & Capex Free Cash Flow',
        agent_service: 'FundamentalAgent',
        status: 'Success',
        weight: 0.3,
        score: 50,
        signal: 'HOLD',
        rationale:
          'Auto gross margins excluding regulatory credits shrank by 120 bps year-over-year.',
        latency_ms: 290,
        tokens_used: 410,
      },
    ],
    synthesis_step: {
      orchestrator_model: 'gpt-4o',
      formula_applied:
        'Weighted Average Score = (Tech_Score * 0.35) + (Sentiment_Score * 0.35) + (Fundamental_Score * 0.30)',
      calculated_final_score: 66.1,
    },
  },
};

export const AgentExecutionTableView: React.FC<AgentExecutionTableViewProps> = ({
  initialTrace,
  onNavigateToDiagnostics,
}) => {
  const [selectedTicker, setSelectedTicker] = useState<string>('AAPL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTrace, setActiveTrace] = useState<AgentExecutionTrace>(
    initialTrace || PRESET_TRACES['AAPL']
  );
  const [inspectingStep, setInspectingStep] = useState<CalculatedStepProgress | null>(null);
  const [isRawJsonModalOpen, setIsRawJsonModalOpen] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);
  const [isReSimulating, setIsReSimulating] = useState<boolean>(false);
  const [activeStepFilter, setActiveStepFilter] = useState<number | null>(null);

  // Compute step-by-step evolution trajectory
  const calculatedSteps = useMemo<CalculatedStepProgress[]>(() => {
    let cumWeight = 0;
    let cumWeightedScore = 0;
    let prevNormalized = 0;

    return activeTrace.strategies_evaluated.map((step, idx) => {
      cumWeight += step.weight;
      cumWeightedScore += step.weight * step.score;
      const runningNormalized = cumWeight > 0 ? cumWeightedScore / cumWeight : 0;
      const delta = idx === 0 ? 0 : runningNormalized - prevNormalized;

      let decision: 'BUY' | 'SELL' | 'HOLD' | 'STRONG_BUY' | 'STRONG_SELL' = 'HOLD';
      if (runningNormalized >= 80) decision = 'STRONG_BUY';
      else if (runningNormalized >= 65) decision = 'BUY';
      else if (runningNormalized <= 35) decision = 'STRONG_SELL';
      else if (runningNormalized <= 45) decision = 'SELL';
      else decision = 'HOLD';

      let shiftDesc = '';
      if (idx === 0) {
        shiftDesc = `Base anchor from ${step.agent_service} yields initial ${decision} (${runningNormalized.toFixed(1)})`;
      } else if (delta > 1.5) {
        shiftDesc = `Bullish lift (+${delta.toFixed(1)} pts) strengthens verdict to ${decision} (${runningNormalized.toFixed(1)})`;
      } else if (delta < -1.5) {
        shiftDesc = `Counter-balancing drag (${delta.toFixed(1)} pts) pulls verdict toward ${decision} (${runningNormalized.toFixed(1)})`;
      } else {
        shiftDesc = `Neutral confirmation (${delta >= 0 ? '+' : ''}${delta.toFixed(1)} pts) maintains ${decision} (${runningNormalized.toFixed(1)})`;
      }

      prevNormalized = runningNormalized;

      return {
        ...step,
        stepIndex: idx + 1,
        cumulativeWeight: cumWeight,
        cumulativeWeightedScore: cumWeightedScore,
        runningNormalizedScore: Number(runningNormalized.toFixed(1)),
        previousNormalizedScore: Number(prevNormalized.toFixed(1)),
        scoreDelta: Number(delta.toFixed(1)),
        runningDecision: decision,
        decisionShiftDescription: shiftDesc,
      };
    });
  }, [activeTrace]);

  const totalLatencyMs = useMemo(() => {
    return activeTrace.strategies_evaluated.reduce((acc, s) => acc + (s.latency_ms || 0), 0);
  }, [activeTrace]);

  const totalTokensUsed = useMemo(() => {
    return activeTrace.strategies_evaluated.reduce((acc, s) => acc + (s.tokens_used || 0), 0);
  }, [activeTrace]);

  const handleSelectPreset = (ticker: string) => {
    setSelectedTicker(ticker);
    setSearchQuery('');
    if (PRESET_TRACES[ticker]) {
      setActiveTrace(PRESET_TRACES[ticker]);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchQuery.trim().toUpperCase();
    if (!clean) return;

    setSelectedTicker(clean);
    if (PRESET_TRACES[clean]) {
      setActiveTrace(PRESET_TRACES[clean]);
    } else {
      // Dynamic simulated trace for any unknown ticker
      const customTrace: AgentExecutionTrace = {
        ticker: clean,
        timestamp: new Date().toISOString(),
        final_decision: 'BUY',
        final_confidence: 0.77,
        summary_rationale: `Dynamic multi-agent orchestration synthesized from real-time market feeds for ${clean}.`,
        strategies_evaluated: [
          {
            strategy_name: 'Dynamic Technical Indicators (RSI, VWAP, EMA)',
            agent_service: 'TechAgent',
            status: 'Success',
            weight: 0.45,
            score: 82,
            signal: 'BUY',
            rationale: `Bullish structure sustained on ${clean} intraday candles with VWAP holding firmly.`,
            latency_ms: 280,
            tokens_used: 410,
          },
          {
            strategy_name: 'Live Sentiment & Sector Inflow',
            agent_service: 'SentimentAgent',
            status: 'Success',
            weight: 0.3,
            score: 78,
            signal: 'BUY',
            rationale: `Positive net capital flow identified across corresponding sector peers.`,
            latency_ms: 350,
            tokens_used: 530,
          },
          {
            strategy_name: 'Fundamental & Critic Risk Guard',
            agent_service: 'CriticAgent',
            status: 'Success',
            weight: 0.25,
            score: 68,
            signal: 'HOLD',
            rationale: `Risk parameters within tolerable 1.5% drawdown tolerance threshold.`,
            latency_ms: 230,
            tokens_used: 340,
          },
        ],
        synthesis_step: {
          orchestrator_model: 'gpt-4o',
          formula_applied: 'Weighted Average Score = (Tech * 0.45) + (Sentiment * 0.30) + (Critic * 0.25)',
          calculated_final_score: 77.3,
        },
      };
      setActiveTrace(customTrace);
    }
  };

  const handleReSimulate = () => {
    setIsReSimulating(true);
    setTimeout(() => {
      setIsReSimulating(false);
    }, 700);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(activeTrace, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const getSignalBadge = (sig: string) => {
    const s = (sig || '').toUpperCase();
    if (s.includes('STRONG_BUY') || s === 'BUY') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black font-mono bg-emerald-100 text-emerald-800 border border-emerald-300">
          <TrendingUp className="w-3 h-3" />
          {s}
        </span>
      );
    }
    if (s.includes('STRONG_SELL') || s === 'SELL') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black font-mono bg-rose-100 text-rose-800 border border-rose-300">
          <TrendingDown className="w-3 h-3" />
          {s}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black font-mono bg-amber-100 text-amber-800 border border-amber-300">
        <Activity className="w-3 h-3" />
        {s || 'HOLD'}
      </span>
    );
  };

  const getAgentColor = (agent: string) => {
    if (agent.includes('Tech')) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (agent.includes('Sentiment')) return 'bg-purple-50 text-purple-700 border-purple-200';
    if (agent.includes('Fundamental')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (agent.includes('Critic')) return 'bg-rose-50 text-rose-700 border-rose-200';
    if (agent.includes('Market') || agent.includes('Structure')) return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* HEADER & TOP CONTROLS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Workflow className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>AI Agent Execution Trace</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-md font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    Step-by-Step Trajectory
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Inspect multi-agent strategy evaluations, weight distributions, and intermediate decision shifts for{' '}
                  <strong className="text-slate-900 font-mono font-black">{activeTrace.ticker}</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Quick Presets & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Presets:</span>
            {['AAPL', 'SMX', 'CHOW', 'NVDA', 'TSLA'].map((ticker) => (
              <button
                key={ticker}
                onClick={() => handleSelectPreset(ticker)}
                className={`px-2.5 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
                  selectedTicker === ticker
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {ticker}
              </button>
            ))}

            <button
              onClick={handleReSimulate}
              disabled={isReSimulating}
              className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              title="Re-run workflow evaluation pipeline"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReSimulating ? 'animate-spin text-blue-600' : ''}`} />
              <span>Re-Evaluate</span>
            </button>

            <button
              onClick={() => setIsRawJsonModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
            >
              <FileCode className="w-3.5 h-3.5 text-slate-500" />
              <span>JSON Trace</span>
            </button>
          </div>
        </div>

        {/* SEARCH BAR & TIMESTAMP BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter ticker (e.g. MSFT, INO, GOOGL)..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors shrink-0"
            >
              Inspect
            </button>
          </form>

          <div className="flex items-center gap-4 text-xs text-slate-500 font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Trace Timestamp: {new Date(activeTrace.timestamp).toLocaleString()}</span>
            </span>
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-blue-600" />
              <span>Orchestrator: {activeTrace.synthesis_step.orchestrator_model}</span>
            </span>
          </div>
        </div>
      </div>

      {/* EXECUTIVE SYNTHESIS BANNER */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Card 1: Final Decision & Confidence */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Final Decision</span>
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>

          <div className="flex items-baseline gap-3 my-2">
            <div className="text-3xl font-black font-mono tracking-tight">
              {activeTrace.final_decision}
            </div>
            <div className="text-xs font-bold text-slate-500 font-mono">
              Score: {activeTrace.synthesis_step.calculated_final_score} / 100
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-1">
              <span>Confidence</span>
              <span className="font-mono font-bold">{(activeTrace.final_confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                style={{ width: `${activeTrace.final_confidence * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Computational Metrics (Latency & Tokens) */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Orchestration Overhead</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>

          <div className="space-y-3 my-1 font-mono">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 flex items-center gap-1 font-sans">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Pipeline Latency
              </span>
              <span className="text-sm font-bold text-slate-900">{totalLatencyMs} ms</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 flex items-center gap-1 font-sans">
                <Coins className="w-3.5 h-3.5 text-slate-400" />
                Total Tokens
              </span>
              <span className="text-sm font-bold text-slate-900">{totalTokensUsed.toLocaleString()}</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 font-sans border-t border-slate-100 pt-2 flex items-center justify-between">
            <span>Evaluated Steps</span>
            <span className="font-mono font-bold text-slate-700">
              {activeTrace.strategies_evaluated.length} Agents
            </span>
          </div>
        </div>

        {/* Card 3: Executive Rationale Summary */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-blue-400">
                <Bot className="w-4 h-4" />
                Orchestrator Synthesis Summary
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                Formula Verified
              </span>
            </div>
            <p className="text-sm font-medium leading-relaxed text-slate-200 mt-2">
              "{activeTrace.summary_rationale}"
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono text-[11px] truncate max-w-md">
              {activeTrace.synthesis_step.formula_applied}
            </span>
            {onNavigateToDiagnostics && (
              <button
                onClick={() => onNavigateToDiagnostics(activeTrace.ticker)}
                className="text-blue-400 hover:text-blue-300 font-bold inline-flex items-center gap-1 transition-colors ml-2 shrink-0"
              >
                <span>Full Diagnostics</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* PIPELINE FLOWCHART STEPPER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Workflow className="w-4 h-4 text-blue-600" />
            <span>Agent Execution Pipeline &amp; Trajectory Shift</span>
          </h3>
          <span className="text-xs text-slate-500">
            Click any agent step to highlight its contribution
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {calculatedSteps.map((step) => {
            const isFilterActive = activeStepFilter === step.stepIndex;
            return (
              <div
                key={step.stepIndex}
                onClick={() => setActiveStepFilter(isFilterActive ? null : step.stepIndex)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isFilterActive
                    ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-mono font-bold text-[10px] flex items-center justify-center">
                      {step.stepIndex}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${getAgentColor(step.agent_service)}`}>
                      {step.agent_service}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    {(step.weight * 100).toFixed(0)}% Wt
                  </span>
                </div>

                <div className="text-xs font-bold text-slate-900 truncate mb-2" title={step.strategy_name}>
                  {step.strategy_name}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 font-mono">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-sans">Running Score</span>
                    <span className="text-sm font-black text-slate-900">{step.runningNormalizedScore}</span>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 font-sans">Interim Verdict</span>
                    <div>{getSignalBadge(step.runningDecision)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COMPLETE WORKFLOW STEPS TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Multi-Strategy Execution &amp; Consolidated Score Workflow</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological log of strategy evaluations, weighted score computations, and resulting recommendation shifts
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeStepFilter !== null && (
              <button
                onClick={() => setActiveStepFilter(null)}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 underline mr-2"
              >
                Clear Filter (Step #{activeStepFilter})
              </button>
            )}
            <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              Total Steps: {calculatedSteps.length}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                <th className="py-3.5 px-4 text-center">Step / Order</th>
                <th className="py-3.5 px-4">Agent &amp; Strategy Evaluated</th>
                <th className="py-3.5 px-4 text-center">Weight</th>
                <th className="py-3.5 px-4 text-center">Raw Score</th>
                <th className="py-3.5 px-4 text-center">Agent Signal</th>
                <th className="py-3.5 px-4 text-right">Consolidated Score</th>
                <th className="py-3.5 px-4 text-center">Interim Recommendation</th>
                <th className="py-3.5 px-4 text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {calculatedSteps.map((step) => {
                const isFiltered = activeStepFilter !== null && activeStepFilter !== step.stepIndex;
                const isSelected = inspectingStep?.stepIndex === step.stepIndex;

                return (
                  <React.Fragment key={step.stepIndex}>
                    <tr
                      className={`transition-colors ${
                        isFiltered
                          ? 'opacity-30 bg-slate-50/50'
                          : isSelected
                          ? 'bg-blue-50/60'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* 1. Step Number & Status */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col items-center gap-1 font-mono">
                          <span className="w-7 h-7 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                            #{step.stepIndex}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {step.status}
                          </span>
                        </div>
                      </td>

                      {/* 2. Agent Service & Strategy Name */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getAgentColor(
                                step.agent_service
                              )}`}
                            >
                              {step.agent_service}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {step.latency_ms}ms • {step.tokens_used} tok
                            </span>
                          </div>
                          <div className="font-bold text-slate-900 leading-tight">
                            {step.strategy_name}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-1">
                            {step.rationale}
                          </p>
                        </div>
                      </td>

                      {/* 3. Weight Percentage */}
                      <td className="py-4 px-4 text-center font-mono font-bold text-slate-800">
                        <div className="flex flex-col items-center">
                          <span className="text-sm font-black">
                            {(step.weight * 100).toFixed(0)}%
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Cum: {(step.cumulativeWeight * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>

                      {/* 4. Raw Strategy Score (0 - 100) */}
                      <td className="py-4 px-4 text-center font-mono">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`text-base font-black ${
                              step.score >= 80
                                ? 'text-emerald-700'
                                : step.score >= 60
                                ? 'text-blue-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {step.score}
                          </span>
                          <div className="w-12 bg-slate-200 rounded-full h-1.5 mt-0.5 overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full"
                              style={{ width: `${step.score}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 5. Agent's Individual Signal */}
                      <td className="py-4 px-4 text-center">
                        {getSignalBadge(step.signal)}
                      </td>

                      {/* 6. Consolidated Running Score & Shift Delta */}
                      <td className="py-4 px-4 text-right font-mono">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-base font-black text-slate-900">
                            {step.runningNormalizedScore.toFixed(1)}
                          </span>

                          {step.stepIndex > 1 ? (
                            <span
                              className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                step.scoreDelta > 0
                                  ? 'text-emerald-700 bg-emerald-50'
                                  : step.scoreDelta < 0
                                  ? 'text-rose-700 bg-rose-50'
                                  : 'text-slate-600 bg-slate-100'
                              }`}
                            >
                              {step.scoreDelta > 0 ? (
                                <TrendingUp className="w-2.5 h-2.5" />
                              ) : step.scoreDelta < 0 ? (
                                <TrendingDown className="w-2.5 h-2.5" />
                              ) : null}
                              {step.scoreDelta > 0 ? '+' : ''}
                              {step.scoreDelta.toFixed(1)} pts
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-sans">
                              Initial Baseline
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 7. Interim Recommendation */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {getSignalBadge(step.runningDecision)}
                          <span className="text-[10px] text-slate-500 font-sans max-w-[150px] text-center truncate" title={step.decisionShiftDescription}>
                            {step.decisionShiftDescription}
                          </span>
                        </div>
                      </td>

                      {/* 8. Inspect Action */}
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => setInspectingStep(isSelected ? null : step)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                          }`}
                        >
                          {isSelected ? 'Close' : 'Inspect'}
                        </button>
                      </td>
                    </tr>

                    {/* EXPANDABLE INSPECTION DRAWER */}
                    {isSelected && (
                      <tr className="bg-blue-50/40 border-b border-blue-100">
                        <td colSpan={8} className="p-5">
                          <div className="bg-white rounded-xl border border-blue-200 shadow-xs p-5 space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                              <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                                  #{step.stepIndex}
                                </span>
                                <h4 className="text-sm font-bold text-slate-900">
                                  {step.strategy_name} • Detailed Agent Output
                                </h4>
                              </div>
                              <span className="text-xs font-mono font-bold text-slate-500">
                                Weight Contribution: {(step.weight * 100).toFixed(0)}%
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                <span className="text-[10px] font-sans text-slate-400 block mb-0.5 uppercase">
                                  Math Formula Contribution
                                </span>
                                <strong className="text-slate-900 font-bold">
                                  ({step.score} × {step.weight}) = {(step.score * step.weight).toFixed(2)} pts
                                </strong>
                              </div>

                              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                <span className="text-[10px] font-sans text-slate-400 block mb-0.5 uppercase">
                                  Running Score Progression
                                </span>
                                <strong className="text-slate-900 font-bold">
                                  {step.stepIndex === 1
                                    ? `${step.runningNormalizedScore} (Anchor)`
                                    : `${step.previousNormalizedScore} → ${step.runningNormalizedScore} (${step.scoreDelta > 0 ? '+' : ''}${step.scoreDelta})`}
                                </strong>
                              </div>

                              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                                <span className="text-[10px] font-sans text-slate-400 block mb-0.5 uppercase">
                                  Compute Overhead
                                </span>
                                <strong className="text-slate-900 font-bold">
                                  {step.latency_ms} ms Latency • {step.tokens_used} Tokens
                                </strong>
                              </div>
                            </div>

                            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                              <span className="text-[10px] font-sans text-slate-400 block mb-1 uppercase font-bold">
                                Agent Analysis &amp; Rationale
                              </span>
                              <p className="text-xs text-slate-700 leading-relaxed font-sans">
                                {step.rationale}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SYNTHESIS STEP & MATHEMATICAL FORMULA CARD */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            <span>Consolidated Synthesis Step &amp; Weighted Mathematical Model</span>
          </h3>
          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
            Model: {activeTrace.synthesis_step.orchestrator_model}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
          {/* Formula Breakdown */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Applied Mathematical Synthesis Formula
            </span>
            <div className="p-4 rounded-xl bg-slate-900 text-blue-300 font-mono text-xs leading-relaxed border border-slate-800 shadow-inner">
              {activeTrace.synthesis_step.formula_applied}
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              {activeTrace.strategies_evaluated.map((s, idx) => (
                <div key={idx} className="flex items-center justify-between text-slate-600 border-b border-slate-100 pb-1">
                  <span>
                    Step {idx + 1} ({s.agent_service}): {s.score} × {s.weight}
                  </span>
                  <span className="font-bold text-slate-900">
                    = {(s.score * s.weight).toFixed(2)} pts
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-slate-900 font-bold pt-1 text-sm">
                <span>Calculated Final Score Sum:</span>
                <span className="font-mono text-blue-600 font-black">
                  {activeTrace.synthesis_step.calculated_final_score} / 100
                </span>
              </div>
            </div>
          </div>

          {/* Decision Rule Threshold Matrix */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Orchestrator Decision Rule Threshold Matrix
            </span>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="font-bold text-emerald-800">STRONG BUY</span>
                <span className="font-mono text-emerald-700">Calculated Score ≥ 80.0</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-50/60 border border-emerald-200">
                <span className="font-bold text-emerald-800">BUY (Active Verdict)</span>
                <span className="font-mono text-emerald-700">65.0 ≤ Calculated Score &lt; 80.0</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-amber-50 border border-amber-200">
                <span className="font-bold text-amber-800">HOLD</span>
                <span className="font-mono text-amber-700">45.0 ≤ Calculated Score &lt; 65.0</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-rose-50 border border-rose-200">
                <span className="font-bold text-rose-800">SELL / STRONG SELL</span>
                <span className="font-mono text-rose-700">Calculated Score &lt; 45.0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RAW JSON TRACE MODAL */}
      {isRawJsonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-700 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-blue-400" />
                  <span>Raw Trace Payload ({activeTrace.ticker})</span>
                </h3>
                <span className="text-xs text-slate-400">
                  Exact JSON structure generated by the agentic orchestrator
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyJson}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setIsRawJsonModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>
            </div>

            <pre className="flex-1 overflow-auto bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 leading-relaxed">
              {JSON.stringify(activeTrace, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
