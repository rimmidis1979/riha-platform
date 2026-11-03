import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  X,
  ExternalLink,
  DollarSign,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Globe2,
  BarChart3,
  FileText,
} from 'lucide-react';
import { StrategyEngineService } from '../../services/strategyEngineService';
import {
  ComprehensiveStrategyReport,
  StrategyCategorySummary,
  StrategyCategoryType,
  StrategyEvaluationItem,
} from '../../types/strategyDiagnostics';

interface StrategyDiagnosticsModalProps {
  symbol: string | null;
  companyName?: string;
  isOpen: boolean;
  onClose: () => void;
  onNavigateToStrategies?: (ticker: string) => void;
  onOpenTradeModal?: (stock: {
    symbol: string;
    companyName: string;
    currentPrice: number;
    defaultSide: 'BUY' | 'SELL';
  }) => void;
}

export const StrategyDiagnosticsModal: React.FC<StrategyDiagnosticsModalProps> = ({
  symbol,
  companyName,
  isOpen,
  onClose,
  onNavigateToStrategies,
  onOpenTradeModal,
}) => {
  const [report, setReport] = useState<ComprehensiveStrategyReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | StrategyCategoryType>('all');

  useEffect(() => {
    if (isOpen && symbol) {
      loadReport(symbol);
    } else {
      setReport(null);
      setError(null);
    }
  }, [isOpen, symbol]);

  const loadReport = async (ticker: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await StrategyEngineService.evaluateAllStrategies(ticker);
      setReport(data);
    } catch (err: any) {
      console.error('Strategy diagnostic evaluation failed:', err);
      setError(err?.message || `Failed to run strategy diagnostics for ${ticker}.`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !symbol) return null;

  const getCategoryIcon = (cat: StrategyCategoryType, className: string = 'w-4 h-4') => {
    switch (cat) {
      case 'technical':
        return <TrendingUp className={className} />;
      case 'fundamental':
        return <BarChart3 className={className} />;
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

  const allStrategies: StrategyEvaluationItem[] = report
    ? report.categories.flatMap((c) => c.strategies)
    : [];

  const filteredStrategies =
    activeTab === 'all'
      ? allStrategies
      : report?.categories.find((c) => c.category === activeTab)?.strategies || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-black font-mono text-lg shadow-md shadow-blue-500/20">
              {symbol.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-black font-mono text-slate-900">{symbol}</h2>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono">
                  Multi-Strategy Diagnostics
                </span>
                {report && (
                  <span
                    className={`text-xs font-black px-2.5 py-0.5 rounded-full uppercase ${
                      report.overallOutcome === 'STRONG_BUY' || report.overallOutcome === 'BUY'
                        ? 'bg-emerald-100 text-emerald-800'
                        : report.overallOutcome === 'AVOID'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    Verdict: {report.overallOutcome}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {companyName || report?.companyName || `${symbol} Equities`} • Live Market Ingestor &amp; Strategy Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadReport(symbol)}
              disabled={isLoading}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Re-run live diagnostics"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {isLoading && (
            <div className="p-12 text-center space-y-3">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm font-bold text-slate-800">
                Running Full Multi-Strategy Diagnostic Scan for {symbol}...
              </p>
              <p className="text-xs text-slate-500 font-mono">
                Querying live VWAP, EMA trend divergence, RSI-14, volume spikes, and critic consensus
              </p>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Strategy Evaluation Notice</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">{error}</p>
              <button
                onClick={() => loadReport(symbol)}
                className="mt-2 px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-800 text-xs font-bold hover:bg-rose-100/50"
              >
                Retry Live Evaluation
              </button>
            </div>
          )}

          {report && !isLoading && (
            <>
              {/* Executive Composite Score Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                      Multi-Category Strategy Score
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {report.applicableCount} of {report.totalStrategiesCount} Applicable
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black font-mono text-blue-400">
                      {report.overallScore}/100
                    </span>
                    <span className="text-xs text-slate-300 font-mono">
                      Confidence: <strong className="text-blue-300">{report.confidencePct}%</strong>
                    </span>
                    <span className="text-xs text-slate-300 font-mono">
                      Consensus: <strong className="text-emerald-400">{report.consensusRating}</strong>
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                    Aggregated across technical momentum, market liquidity, SEC filings, and risk mitigations.
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block mb-0.5">
                    Live Ticker Price
                  </span>
                  <span className="text-2xl font-black font-mono text-white block">
                    ${report.price.toFixed(2)}
                  </span>
                  <span
                    className={`text-xs font-bold font-mono inline-flex items-center gap-0.5 ${
                      report.dayChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {report.dayChangePct >= 0 ? '+' : ''}
                    {report.dayChangePct.toFixed(2)}% Today
                  </span>
                </div>
              </div>

              {/* 6 Category Summary Breakdown Grid */}
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">
                  Category Score Breakdown
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {report.categories.map((cat) => (
                    <button
                      key={cat.category}
                      onClick={() => setActiveTab(cat.category === activeTab ? 'all' : cat.category)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        activeTab === cat.category
                          ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-center justify-between text-slate-500 mb-1.5">
                        <span className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
                          {getCategoryIcon(cat.category, 'w-3 h-3')}
                        </span>
                        <span className="text-xs font-black font-mono text-slate-900">
                          {cat.score}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-slate-800 truncate" title={cat.title}>
                        {cat.title.split(' ')[0]}
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-700 uppercase mt-0.5">
                        {cat.finalOutcome}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'all'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All Applied Strategies ({allStrategies.length})
                </button>
                {report.categories.map((cat) => (
                  <button
                    key={cat.category}
                    onClick={() => setActiveTab(cat.category)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                      activeTab === cat.category
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {cat.title.split(' ')[0]} ({cat.strategies.length})
                  </button>
                ))}
              </div>

              {/* Applied Strategies List */}
              <div className="space-y-3">
                {filteredStrategies.map((item) => {
                  const isBuy = item.signal === 'BUY' || item.signal === 'STRONG_BUY';
                  const isSell = item.signal === 'SELL';
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        item.isApplicable
                          ? 'bg-white border-slate-200 shadow-2xs hover:shadow-xs'
                          : 'bg-slate-50/70 border-slate-200/60 opacity-80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                item.isApplicable
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {item.statusLabel}
                            </span>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase font-mono ${
                                isBuy
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : isSell
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              Signal: {item.signal}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 font-bold">
                              {item.id}
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-slate-900">{item.name}</h5>
                        </div>

                        {/* Strategy Score */}
                        <div className="text-left sm:text-right shrink-0">
                          <span className="text-[10px] uppercase font-mono text-slate-400 block">Score</span>
                          <span className="text-base font-black font-mono text-slate-900">
                            {item.score}/100
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                        {item.reasonWhy}
                      </p>

                      <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] font-mono text-slate-500">
                        <span><strong>Rule:</strong> {item.ruleCondition}</span>
                        <span>•</span>
                        <span><strong>Key Metric:</strong> {item.keyMetric}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-mono">
            {report ? `Evaluated ${report.totalStrategiesCount} strategies at ${report.evaluatedAt}` : 'Real-time telemetry'}
          </div>

          <div className="flex items-center gap-2.5">
            {onNavigateToStrategies && (
              <button
                type="button"
                onClick={() => {
                  onNavigateToStrategies(symbol);
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Full Strategy Analysis Page</span>
              </button>
            )}

            {onOpenTradeModal && report && (
              <button
                type="button"
                onClick={() => {
                  onOpenTradeModal({
                    symbol: report.ticker,
                    companyName: report.companyName,
                    currentPrice: report.price,
                    defaultSide: report.overallOutcome === 'STRONG_BUY' || report.overallOutcome === 'BUY' ? 'BUY' : 'SELL',
                  });
                  onClose();
                }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>Trade {symbol}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

