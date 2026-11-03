import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  TrendingUp,
  BarChart3,
  FileText,
  Activity,
  Globe2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  Info,
  DollarSign,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  Play,
  Pause,
  Radio,
} from 'lucide-react';
import { StrategyEngineService } from '../services/strategyEngineService';
import {
  ComprehensiveStrategyReport,
  StrategyCategorySummary,
  StrategyCategoryType,
  StrategyEvaluationItem,
  StrategyOutcome,
  StrategySignal,
} from '../types/strategyDiagnostics';
import { useTrading } from '../context/TradingContext';

export const StrategyAnalysisPage: React.FC = () => {
  const { openTradeModal } = useTrading();

  const [inputTicker, setInputTicker] = useState<string>('');
  const [activeTicker, setActiveTicker] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'main' | StrategyCategoryType>('main');
  const [report, setReport] = useState<ComprehensiveStrategyReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Live Backend Poller state
  const [isLivePolling, setIsLivePolling] = useState<boolean>(true);
  const [pollIntervalMs, setPollIntervalMs] = useState<number>(3000);
  const [lastPolledAt, setLastPolledAt] = useState<string>('');
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const [isPollUpdating, setIsPollUpdating] = useState<boolean>(false);

  const runEvaluation = async (tickerToEval: string) => {
    const cleanTicker = (tickerToEval || '').trim().toUpperCase();
    if (!cleanTicker) {
      setError('Please enter a valid stock ticker symbol.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await StrategyEngineService.evaluateAllStrategies(cleanTicker);
      setReport(data);
      setActiveTicker(data.ticker);
      setLastPolledAt(new Date().toLocaleTimeString());
      setError(null);
    } catch (err: any) {
      console.error('Failed to evaluate strategies:', err);
      setError(err?.message || 'Failed to evaluate live strategies from microservices');
    } finally {
      setIsLoading(false);
    }
  };

  // Check for pre-selected ticker from Account or Holdings navigation
  useEffect(() => {
    const savedTicker = sessionStorage.getItem('riha_selected_strategy_ticker');
    if (savedTicker) {
      sessionStorage.removeItem('riha_selected_strategy_ticker');
      setInputTicker(savedTicker);
      runEvaluation(savedTicker);
    }
  }, []);

  // Continuous Backend Poller Effect for Real-Time Market Ticks
  useEffect(() => {
    if (!isLivePolling || !activeTicker || isLoading) {
      return;
    }

    const intervalId = setInterval(async () => {
      try {
        setIsPollUpdating(true);
        const tick = await StrategyEngineService.pollLiveQuote(activeTicker);
        setReport((prev) => {
          if (!prev) return prev;
          if (tick.lastPrice > prev.price) {
            setPriceFlash('up');
            setTimeout(() => setPriceFlash(null), 800);
          } else if (tick.lastPrice < prev.price) {
            setPriceFlash('down');
            setTimeout(() => setPriceFlash(null), 800);
          }
          return {
            ...prev,
            price: tick.lastPrice > 0 ? tick.lastPrice : prev.price,
            volume: tick.dayVolume > 0 ? tick.dayVolume : prev.volume,
            relativeVolume: tick.relativeVolume > 0 ? tick.relativeVolume : prev.relativeVolume,
            evaluatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          };
        });
        setLastPolledAt(new Date().toLocaleTimeString());
      } catch (pollErr) {
        console.debug('Backend live poller tick note:', pollErr);
      } finally {
        setIsPollUpdating(false);
      }
    }, pollIntervalMs);

    return () => clearInterval(intervalId);
  }, [isLivePolling, activeTicker, isLoading, pollIntervalMs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputTicker.trim()) {
      runEvaluation(inputTicker.trim().toUpperCase());
    }
  };

  const getCategoryIcon = (category: StrategyCategoryType, className: string = 'w-4 h-4') => {
    switch (category) {
      case 'technical':
        return <BarChart3 className={className} />;
      case 'fundamental':
        return <TrendingUp className={className} />;
      case 'regulatory_sec':
        return <FileText className={className} />;
      case 'market_structure':
        return <Activity className={className} />;
      case 'sentiment_macro':
        return <Globe2 className={className} />;
      case 'critic_risk':
        return <ShieldCheck className={className} />;
      default:
        return <Layers className={className} />;
    }
  };

  const getSignalBadge = (signal: StrategySignal) => {
    switch (signal) {
      case 'STRONG_BUY':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-300">STRONG BUY</span>;
      case 'BUY':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200">BUY</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-blue-100 text-blue-800 border border-blue-300">APPROVED</span>;
      case 'PASS':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-cyan-100 text-cyan-800 border border-cyan-200">PASS</span>;
      case 'HOLD':
      case 'NEUTRAL':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-amber-50 text-amber-700 border border-amber-200">HOLD</span>;
      case 'SELL':
      case 'RISK_ALERT':
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-rose-100 text-rose-800 border border-rose-300">RISK ALERT</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold font-mono bg-slate-100 text-slate-700 border border-slate-200">{signal}</span>;
    }
  };

  const getOutcomeBadge = (outcome: StrategyOutcome) => {
    switch (outcome) {
      case 'STRONG_BULLISH':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">STRONG BULLISH</span>;
      case 'BULLISH':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">BULLISH</span>;
      case 'APPROVED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">CRITIC APPROVED</span>;
      case 'NEUTRAL':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">NEUTRAL</span>;
      case 'BEARISH':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">BEARISH</span>;
      case 'HIGH_RISK':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">HIGH RISK</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">{outcome}</span>;
    }
  };

  const activeCategorySummary = report?.categories.find((c) => c.category === activeTab);

  return (
    <div className="space-y-6">
      {/* Header & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Institutional Multi-Strategy Diagnostic Engine
            </h1>
          </div>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Input any stock ticker to execute and cross-evaluate 20+ specialized algorithmic, quantitative, fundamental, SEC regulatory, order flow, and Critic risk strategies.
          </p>
        </div>

        {report && (
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => runEvaluation(activeTicker)}
              disabled={isLoading}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
              <span>Re-Evaluate</span>
            </button>
            <button
              onClick={() =>
                openTradeModal({
                  symbol: report.ticker,
                  companyName: report.companyName,
                  currentPrice: report.price,
                  defaultSide: 'BUY',
                })
              }
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Trade {report.ticker}</span>
            </button>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={inputTicker}
              onChange={(e) => setInputTicker(e.target.value.toUpperCase())}
              placeholder="Enter any stock ticker symbol (e.g. any US-listed equity)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold tracking-wider text-slate-900 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !inputTicker.trim()}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Analyzing Strategies...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analyze All Strategies</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error Alert (Zero-Mock Data Policy) */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-rose-900 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-rose-900">
                    Live Microservice Telemetry Unavailable
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-200 text-rose-800">
                    Zero-Mock Policy Enforced
                  </span>
                </div>
                <p className="text-xs text-rose-700 mt-1 font-mono">
                  {error}
                </p>
              </div>
            </div>
            <button
              onClick={() => runEvaluation(activeTicker)}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-rose-300 text-rose-800 hover:bg-rose-100/50 transition-colors shadow-sm disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Retry Live Feed</span>
            </button>
          </div>
          <div className="text-[11px] text-rose-700/90 bg-white/70 p-3 rounded-xl border border-rose-200/60 leading-relaxed font-sans">
            Under RIHA&apos;s Institutional Zero-Mock Data Policy, simulated indicators and fallback mock data are strictly prohibited. The Multi-Strategy Diagnostic Engine requires active live telemetry from <code>riha-stock-ai-market-ingestor</code> (port 8091) and <code>riha-stock-ai-strategy-service</code> (port 8093).
          </div>
        </div>
      )}

      {/* Empty State Prompt (No hardcoded tickers) */}
      {!report && !isLoading && !error && (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 shadow-sm text-center max-w-2xl mx-auto space-y-4 my-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
            <Search className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              No Stock Ticker Evaluated Yet
            </h3>
            <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
              Enter any US-listed stock ticker symbol above and click <strong>&quot;Analyze All Strategies&quot;</strong> to fetch real-time underneath market data, SEC filings, and Critic risk findings.
            </p>
          </div>
          <div className="text-xs text-slate-400 font-mono bg-slate-50 py-2 px-4 rounded-xl inline-block border border-slate-100">
            Adheres to 100% Zero-Mock Policy • No Hardcoded Stock Tickers • Direct Microservice Feeds
          </div>
        </div>
      )}

      {/* Stock Ticker Profile Header & Live Poller Bar */}
      {report && (
        <div className="space-y-3">
          {/* Real-Time Live Backend Poller Bar */}
          <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl flex flex-wrap items-center justify-between gap-4 shadow-sm border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <span className={`w-3 h-3 rounded-full ${isLivePolling ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'}`} />
                <span className={`absolute w-2 h-2 rounded-full ${isLivePolling ? 'bg-emerald-400' : 'bg-slate-400'}`} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono tracking-wider uppercase text-slate-200">
                  {isLivePolling ? 'Live Backend Poller Active' : 'Backend Poller Paused'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-900/60 text-blue-300 border border-blue-700/50">
                  Robinhood L1 Stream
                </span>
                {isPollUpdating && (
                  <span className="text-[10px] text-emerald-400 font-mono animate-pulse">
                    fetching tick...
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-[11px] font-mono">
                <span className="px-2 text-slate-400">Rate:</span>
                {[1000, 3000, 5000].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setPollIntervalMs(rate)}
                    className={`px-2 py-0.5 rounded ${
                      pollIntervalMs === rate
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {rate / 1000}s
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsLivePolling(!isLivePolling)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs transition-colors shadow-sm ${
                  isLivePolling
                    ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isLivePolling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isLivePolling ? 'Pause Poller' : 'Resume Poller'}</span>
              </button>

              <button
                onClick={() => runEvaluation(activeTicker)}
                disabled={isLoading}
                title="Force complete multi-strategy diagnostic evaluation"
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Re-Evaluate All</span>
              </button>

              {lastPolledAt && (
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                  Last tick: {lastPolledAt}
                </span>
              )}
            </div>
          </div>

          {/* Profile Header */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black font-mono text-xl shadow-md shadow-blue-500/20">
                {report.ticker.slice(0, 3)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black font-mono text-slate-900 tracking-tight">
                    {report.ticker}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600">
                    {report.sector}
                  </span>
                  <span className="text-xs text-slate-400">
                    Evaluated at {report.evaluatedAt}
                  </span>
                </div>
                <p className="text-sm font-medium text-slate-600 mt-0.5">{report.companyName}</p>
              </div>
            </div>

            {/* Core Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-6 font-mono">
              <div
                className={`px-4 py-2.5 rounded-xl border transition-all duration-300 ${
                  priceFlash === 'up'
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-950 ring-2 ring-emerald-300 scale-105'
                    : priceFlash === 'down'
                    ? 'bg-rose-100 border-rose-400 text-rose-950 ring-2 ring-rose-300 scale-105'
                    : 'bg-slate-50 border-slate-200/80 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-sans text-slate-500 font-bold block">Live Price</span>
                  {priceFlash === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-600 animate-bounce" />}
                  {priceFlash === 'down' && <TrendingDown className="w-3.5 h-3.5 text-rose-600 animate-bounce" />}
                </div>
                <span className="text-lg font-black block">${report.price.toFixed(2)}</span>
              </div>
              <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-sans text-slate-500 font-bold block">24H Change</span>
                <span className={`text-lg font-black flex items-center gap-1 ${report.dayChangePct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {report.dayChangePct >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {report.dayChangePct >= 0 ? '+' : ''}{report.dayChangePct.toFixed(2)}%
                </span>
              </div>
              <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-sans text-slate-500 font-bold block">Relative Volume</span>
                <span className="text-lg font-black text-slate-900">{report.relativeVolume.toFixed(2)}x</span>
              </div>
              <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200/80">
                <span className="text-[10px] uppercase font-sans text-slate-500 font-bold block">Market Cap</span>
                <span className="text-lg font-black text-slate-900">{report.marketCap}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      {report && (
        <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto">
          {/* Main Overview Tab */}
          <button
            onClick={() => setActiveTab('main')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'main'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Category Matrix &amp; Score Calculation</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
              activeTab === 'main' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {report.overallScore}/100
            </span>
          </button>

          {/* Category Tabs */}
          {report.categories.map((cat) => {
            const isActive = activeTab === cat.category;
            return (
              <button
                key={cat.category}
                onClick={() => setActiveTab(cat.category)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {getCategoryIcon(cat.category, 'w-3.5 h-3.5')}
                <span>{cat.title.split(' ')[0]}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  isActive ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {cat.score}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* TAB 1: Main Tab (Overview, Category Table, and Overall Score Calculation) */}
      {report && activeTab === 'main' && (
        <div className="space-y-6">
          {/* Executive Overall Score Calculation Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    AGGREGATED MULTI-STRATEGY CONVERGENCE
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {report.applicableCount} of {report.totalStrategiesCount} Strategies Applicable
                  </span>
                </div>
                <h3 className="text-3xl font-black tracking-tight">
                  Overall Score: <span className="text-blue-400 font-mono">{report.overallScore}/100</span>
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Composite score is calculated using multi-category weighted summation. The algorithm verifies technical trend momentum, fundamental cash-flow support, SEC dilution safety, and cryptographic Critic approval.
                </p>
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-xs font-mono">
                    <span className="text-slate-400">Consensus:</span> <strong className="text-emerald-400">{report.consensusRating}</strong>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 text-xs font-mono">
                    <span className="text-slate-400">Confidence:</span> <strong className="text-blue-300">{report.confidencePct}%</strong>
                  </div>
                </div>
              </div>

              {/* Big Circular/Metric Gauge */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center shrink-0 w-full md:w-56">
                <span className="text-xs uppercase font-mono tracking-wider text-slate-400 block mb-1">Composite Verdict</span>
                <span className="text-4xl font-black font-mono text-emerald-400 block mb-2">{report.overallOutcome}</span>
                <div className="w-full bg-slate-700/80 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-emerald-400 h-2.5 rounded-full transition-all duration-1000"
                    style={{ width: `${report.overallScore}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono text-slate-400 mt-2 block">
                  Weighted Score: {report.overallScore} / 100
                </span>
              </div>
            </div>

            {/* Score Formula Visualizer */}
            <div className="mt-6 pt-5 border-t border-white/10 text-xs font-mono text-slate-300 space-y-2">
              <div className="flex items-center gap-2 text-slate-400 font-bold uppercase text-[11px]">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                <span>Overall Score Mathematical Formula:</span>
              </div>
              <div className="p-3 bg-black/40 rounded-xl border border-white/10 overflow-x-auto text-blue-200">
                {report.scoreFormula}
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <span>Calculation breakdown:</span>
                {report.categories.map((c, i) => (
                  <span key={c.category} className="text-white">
                    ({c.score} × {c.weightPercent}%)
                    {i < report.categories.length - 1 ? ' + ' : ''}
                  </span>
                ))}
                <span className="text-emerald-400 font-bold">= {report.overallScore}</span>
              </div>
            </div>
          </div>

          {/* Table List of Categories & Final Outcome */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Category Breakdown &amp; Final Outcome Matrix
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed outcomes and weighted contribution from each strategy domain.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500">
                {report.categories.length} Strategy Categories
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-mono uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-4 font-bold">Category</th>
                    <th className="py-3 px-4 font-bold">Weight</th>
                    <th className="py-3 px-4 font-bold">Category Score</th>
                    <th className="py-3 px-4 font-bold">Final Outcome</th>
                    <th className="py-3 px-4 font-bold">Applicability</th>
                    <th className="py-3 px-4 font-bold">Key Drivers / Summary</th>
                    <th className="py-3 px-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {report.categories.map((cat) => (
                    <tr
                      key={cat.category}
                      className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                      onClick={() => setActiveTab(cat.category)}
                    >
                      <td className="py-4 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-slate-100 text-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            {getCategoryIcon(cat.category)}
                          </div>
                          <div>
                            <span className="font-bold block text-slate-900">{cat.title}</span>
                            <span className="text-xs text-slate-500 block max-w-xs line-clamp-1">{cat.subtitle}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono font-semibold text-slate-700">
                        {cat.weightPercent}%
                      </td>
                      <td className="py-4 px-4">
                        <div className="space-y-1 w-32">
                          <div className="flex justify-between text-xs font-mono font-bold">
                            <span>{cat.score}</span>
                            <span className="text-slate-400">/100</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${cat.score}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {getOutcomeBadge(cat.finalOutcome)}
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-slate-600">
                        <span className="font-bold text-slate-900">{cat.applicableCount}</span> / {cat.totalCount} Strategies
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-600 max-w-sm">
                        <p className="line-clamp-2">{cat.summaryVerdict}</p>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTab(cat.category);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 hover:text-white hover:bg-blue-600 transition-colors border border-blue-200"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY TABS (Technical, Fundamental, SEC Regulatory, Market Structure, Sentiment, Critic Risk) */}
      {report && activeTab !== 'main' && activeCategorySummary && (
        <div className="space-y-6">
          {/* Category Banner Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3.5 rounded-2xl bg-blue-100 text-blue-600">
                {getCategoryIcon(activeCategorySummary.category, 'w-6 h-6')}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-slate-900">{activeCategorySummary.title}</h3>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold border border-slate-200">
                    Weight: {activeCategorySummary.weightPercent}%
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">{activeCategorySummary.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Category Score</span>
                <span className="text-3xl font-black font-mono text-slate-900">{activeCategorySummary.score}/100</span>
              </div>
              <div>{getOutcomeBadge(activeCategorySummary.finalOutcome)}</div>
            </div>
          </div>

          {/* Strategies Execution List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-600 font-mono">
                Executed Strategies ({activeCategorySummary.strategies.length})
              </h4>
              <span className="text-xs text-slate-500">
                {activeCategorySummary.applicableCount} of {activeCategorySummary.totalCount} conditions currently applicable
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {activeCategorySummary.strategies.map((strat: StrategyEvaluationItem) => {
                const isApp = strat.isApplicable;
                return (
                  <div
                    key={strat.id}
                    className={`bg-white p-5 rounded-2xl border transition-all shadow-sm ${
                      isApp
                        ? 'border-slate-200 hover:border-blue-400'
                        : 'border-slate-200/60 bg-slate-50/50 opacity-90'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Strategy Header & Info */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {strat.id}
                          </span>
                          <h5 className="text-base font-bold text-slate-900">{strat.name}</h5>
                          {isApp ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> APPLICABLE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-slate-200 text-slate-600 border border-slate-300">
                              <XCircle className="w-3.5 h-3.5" /> NOT APPLICABLE
                            </span>
                          )}
                          {getSignalBadge(strat.signal)}
                        </div>

                        <p className="text-xs text-slate-500">{strat.shortDescription}</p>

                        {/* Description of why it is applicable or not */}
                        <div className={`p-3 rounded-xl border text-xs leading-relaxed mt-2 ${
                          isApp
                            ? 'bg-blue-50/50 border-blue-100 text-slate-800'
                            : 'bg-slate-100/70 border-slate-200 text-slate-600'
                        }`}>
                          <strong className="text-slate-900 font-semibold block mb-0.5">Evaluation Verdict &amp; Rationale:</strong>
                          <span>{strat.reasonWhy}</span>
                        </div>
                      </div>

                      {/* Right Metrics Strip */}
                      <div className="flex lg:flex-col items-center lg:items-end justify-between gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 font-mono">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Strategy Score</span>
                          <span className="text-2xl font-black text-slate-900">{strat.score}</span>
                        </div>

                        <div className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                          <span className="text-slate-500 font-sans block text-[10px]">Rule Metric</span>
                          <strong className="text-slate-900">{strat.keyMetric}</strong>
                        </div>

                        {strat.timeframe && (
                          <span className="text-[10px] text-slate-400 font-sans">
                            Timeframe: <strong>{strat.timeframe}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
