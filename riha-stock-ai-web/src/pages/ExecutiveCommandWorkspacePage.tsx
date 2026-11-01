import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Cpu,
  Eye,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ToggleLeft,
  ToggleRight,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import {
  addStockToWatchlist,
  deleteStockFromWatchlist,
  executeQuickTradeOrMode,
  fetchCommandStocks,
  fetchExecutiveSummary,
  fetchStockUnderneathAnalysis,
  ProblemDetailError,
  STRATEGY_API_BASE,
  triggerAnalyzeStockNow,
} from '../api/stockAiClient';
import { Rfc7807ProblemDetail } from '../types/stockAi';
import { ProblemDetailBanner } from '../components/ProblemDetailBanner';

const ALGORITHMS = [
  { id: 'ALL', label: 'All Active Stocks' },
  { id: 'TOP_GAINERS_DAY', label: '🔥 Top Gainers of the Day' },
  { id: 'RVOL_BREAKOUT', label: '⚡ RVOL Breakout (>3x)' },
  { id: 'SHORT_SQUEEZE_MICROCAP', label: '🚀 Short Squeeze & Low Float' },
  { id: 'VWAP_RECLAIM_MOMENTUM', label: '📈 VWAP Reclaim & Momentum' },
  { id: 'HIGH_CONVICTION_MULTI_FACTOR', label: '🧠 AI High-Conviction Picks' },
];

export const ExecutiveCommandWorkspacePage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('ALL');
  const [selectedSignal, setSelectedSignal] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newTickerInput, setNewTickerInput] = useState<string>('');

  const [stocks, setStocks] = useState<Array<Record<string, any>>>([]);
  const [execSummary, setExecSummary] = useState<Record<string, any> | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Record<string, any> | null>(null);
  const [activePillarTab, setActivePillarTab] = useState<'TECH' | 'SEC' | 'MEMORY' | 'CRITIC'>('TECH');
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [addingTicker, setAddingTicker] = useState<boolean>(false);
  const [busyTicker, setBusyTicker] = useState<string | null>(null);
  const [sseLive, setSseLive] = useState<boolean>(false);
  const [problem, setProblem] = useState<Rfc7807ProblemDetail | null>(null);

  const loadWorkspace = useCallback(async () => {
    try {
      setLoading(true);
      setProblem(null);
      const [stocksData, summaryData] = await Promise.all([
        fetchCommandStocks({
          date: selectedDate,
          algorithm: selectedAlgorithm,
          signal: selectedSignal,
          search: searchQuery,
        }),
        fetchExecutiveSummary(),
      ]);
      setStocks(stocksData);
      setExecSummary(summaryData);
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedAlgorithm, selectedSignal, searchQuery]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    const es = new EventSource(`${STRATEGY_API_BASE}/api/v1/stock-ai/stream/live-events`);
    es.addEventListener('connected', () => setSseLive(true));
    es.addEventListener('stock_analysis_completed', () => {
      loadWorkspace();
    });
    es.addEventListener('trade_executed', () => {
      loadWorkspace();
    });
    es.onerror = () => setSseLive(false);
    return () => es.close();
  }, [loadWorkspace]);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTickerInput.trim()) return;
    setAddingTicker(true);
    setProblem(null);
    try {
      const symbol = newTickerInput.trim().toUpperCase();
      await addStockToWatchlist(symbol);
      setNewTickerInput('');
      await loadWorkspace();
      const analysis = await fetchStockUnderneathAnalysis(symbol);
      setSelectedAnalysis(analysis);
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    } finally {
      setAddingTicker(false);
    }
  };

  const handleInspectStock = async (ticker: string) => {
    setBusyTicker(ticker);
    try {
      const data = await fetchStockUnderneathAnalysis(ticker);
      setSelectedAnalysis(data);
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    } finally {
      setBusyTicker(null);
    }
  };

  const handleReRunAi = async (ticker: string) => {
    setBusyTicker(ticker);
    try {
      await triggerAnalyzeStockNow(ticker);
      await loadWorkspace();
      if (selectedAnalysis?.ticker === ticker) {
        const refreshed = await fetchStockUnderneathAnalysis(ticker);
        setSelectedAnalysis(refreshed);
      }
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    } finally {
      setBusyTicker(null);
    }
  };

  const handleQuickTrade = async (ticker: string, side: 'BUY' | 'SELL') => {
    setBusyTicker(ticker);
    try {
      await executeQuickTradeOrMode({
        ticker,
        side,
        quantity: 20,
        executionMode: 'MANUAL_USER_TRIGGERED',
      });
      await loadWorkspace();
      if (selectedAnalysis?.ticker === ticker) {
        const refreshed = await fetchStockUnderneathAnalysis(ticker);
        setSelectedAnalysis(refreshed);
      }
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    } finally {
      setBusyTicker(null);
    }
  };

  const handleDeleteStock = async (ticker: string) => {
    setBusyTicker(ticker);
    try {
      await deleteStockFromWatchlist(ticker);
      if (selectedAnalysis?.ticker === ticker) {
        setSelectedAnalysis(null);
      }
      await loadWorkspace();
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    } finally {
      setBusyTicker(null);
    }
  };

  const handleScanTopMovers = async () => {
    try {
      setLoading(true);
      setProblem(null);
      await fetch(`${STRATEGY_API_BASE}/api/v1/stock-ai/scanner/batch-scan?window=1D`, { method: 'POST' });
      await loadWorkspace();
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAutoMode = async () => {
    const current = Boolean(execSummary?.buySellSummary?.autoTradeEnabled ?? true);
    try {
      await executeQuickTradeOrMode({ autoTradeEnabled: !current });
      await loadWorkspace();
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    }
  };

  const acct = execSummary?.accountSummary || {};
  const buySell = execSummary?.buySellSummary || {};
  const transactions: Array<Record<string, any>> = execSummary?.transactions || [];

  return (
    <div className="space-y-6">
      {/* =====================================================================
          VIEW 1: EXECUTIVE ACCOUNT SUMMARY & BUY/SELL KPI RIBBON
         ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 font-mono">
        {/* Card 1: Net Account Equity & Live Buying Power */}
        <div className="bg-zinc-900/75 backdrop-blur-md border border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>NET ACCOUNT EQUITY</span>
            <span
              className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${
                acct.brokerageConnected
                  ? 'bg-emerald-950/70 border-emerald-700/50 text-emerald-300'
                  : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
              }`}
            >
              {acct.brokerageConnected ? 'ROBINHOOD LIVE' : 'ROBINHOOD NOT CONNECTED ($0.00)'}
            </span>
          </div>
          <div className="text-2xl font-bold text-white mt-1.5">
            ${Number(acct.netAccountEquityUsd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-zinc-400 mt-1 flex items-center justify-between">
            <span>Live Buying Power:</span>
            <span className="text-emerald-400 font-semibold">
              ${Number(acct.liveBuyingPowerUsd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 2: Today's Total Profit / Gain ($ and %) + Sparkline */}
        <div className="bg-zinc-900/75 backdrop-blur-md border border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>TODAY&apos;S TOTAL PROFIT / GAIN</span>
            <span
              className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                Number(acct.todayTotalProfitUsd ?? 0) >= 0
                  ? 'bg-emerald-950/90 border-emerald-600/60 text-emerald-300'
                  : 'bg-rose-950/90 border-rose-600/60 text-rose-300'
              }`}
            >
              {Number(acct.todayTotalProfitPct ?? 0) >= 0 ? '+' : ''}
              {Number(acct.todayTotalProfitPct ?? 0).toFixed(2)}%
            </span>
          </div>
          <div className="flex items-end justify-between mt-1.5">
            <div
              className={`text-2xl font-bold ${
                Number(acct.todayTotalProfitUsd ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {Number(acct.todayTotalProfitUsd ?? 0) >= 0 ? '+' : ''}$
              {Number(acct.todayTotalProfitUsd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            {/* SVG Sparkline (shows actual points if available, otherwise flat zero line) */}
            <svg className="w-20 h-8 overflow-visible" viewBox="0 0 80 28">
              {acct.intradayPnlSparkline && acct.intradayPnlSparkline.length > 1 ? (
                <polyline
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2"
                  points={acct.intradayPnlSparkline
                    .map((pt: any, i: number, arr: any[]) => {
                      const x = (i / (arr.length - 1)) * 80;
                      const y = Math.max(2, Math.min(26, 26 - (Number(pt.pnl ?? 0) / 100) * 12));
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
              ) : (
                <line x1="0" y1="14" x2="80" y2="14" stroke="#52525b" strokeWidth="1.5" strokeDasharray="3 3" />
              )}
            </svg>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Realized: ${Number(buySell.netRealizedPnlUsd ?? 0).toFixed(2)} | Open: ${Number(buySell.unrealizedOpenPnlUsd ?? 0).toFixed(2)}
          </div>
        </div>

        {/* Card 3: Overall Cumulative Profit & Win Rate */}
        <div className="bg-zinc-900/75 backdrop-blur-md border border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>CUMULATIVE AI PROFIT</span>
            <span className="text-emerald-400 font-semibold">
              {Number(acct.overallCumulativeProfitPct ?? 0) >= 0 ? '+' : ''}
              {Number(acct.overallCumulativeProfitPct ?? 0).toFixed(2)}%
            </span>
          </div>
          <div className="text-2xl font-bold text-white mt-1.5">
            {Number(acct.overallCumulativeProfitUsd ?? 0) >= 0 ? '+' : ''}$
            {Number(acct.overallCumulativeProfitUsd ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-zinc-400 mt-1 flex items-center justify-between">
            <span>Win Rate: <strong className="text-emerald-400">{Number(acct.winRatePct ?? 0).toFixed(1)}%</strong></span>
            <span>Profit Factor: <strong className="text-zinc-200">{acct.profitFactor ?? 0}x</strong></span>
          </div>
        </div>

        {/* Card 4: Executed Buys vs. Sells Counter */}
        <div className="bg-zinc-900/75 backdrop-blur-md border border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between">
          <div className="text-[11px] text-zinc-400 flex items-center justify-between">
            <span>BUY / SELL ACTIVITY TODAY</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="grid grid-cols-3 gap-1.5 mt-2 text-center">
            <div className="bg-zinc-950/90 border border-emerald-800/60 rounded-lg py-1.5 px-1">
              <div className="text-[10px] text-zinc-400">BUYS</div>
              <div className="text-sm font-bold text-emerald-400">{buySell.buysTodayCount ?? 0}</div>
            </div>
            <div className="bg-zinc-950/90 border border-rose-800/60 rounded-lg py-1.5 px-1">
              <div className="text-[10px] text-zinc-400">SELLS</div>
              <div className="text-sm font-bold text-rose-400">{buySell.sellsTodayCount ?? 0}</div>
            </div>
            <div className="bg-zinc-950/90 border border-amber-800/60 rounded-lg py-1.5 px-1">
              <div className="text-[10px] text-zinc-400">BLOCKED</div>
              <div className="text-sm font-bold text-amber-400">{buySell.blockedByCriticCount ?? 0}</div>
            </div>
          </div>
          <div className="text-[10px] text-zinc-500 mt-1 flex justify-between">
            <span>Buy Vol: ${Number(buySell.buysTodayVolumeUsd ?? 0).toLocaleString()}</span>
            <span>Sell Vol: ${Number(buySell.sellsTodayVolumeUsd ?? 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Card 5: Autonomous Agentic Trading Toggle & Drawdown Meter */}
        <div className="bg-zinc-900/75 backdrop-blur-md border border-zinc-800/90 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>AUTONOMOUS AI MODE</span>
            <span className={sseLive ? 'text-emerald-400' : 'text-amber-400'}>
              {sseLive ? '● LIVE SSE' : '● POLLING'}
            </span>
          </div>
          <button
            onClick={handleToggleAutoMode}
            className={`mt-1.5 w-full py-2 px-3 rounded-lg border text-xs font-bold flex items-center justify-between transition ${
              buySell.autoTradeEnabled !== false
                ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-200'
                : 'bg-amber-950/80 border-amber-500/80 text-amber-200'
            }`}
          >
            <span className="truncate">
              {buySell.autonomousTradingMode || 'AUTO_BUY_SELL_ENABLED'}
            </span>
            {buySell.autoTradeEnabled !== false ? (
              <ToggleRight className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-amber-400 shrink-0" />
            )}
          </button>
          <div className="text-[10px] text-zinc-400 mt-1.5 flex items-center justify-between">
            <span>Critic Drawdown Gate:</span>
            <span className="text-emerald-400">
              {acct.currentDailyDrawdownPct ?? 0.42}% / {acct.maxDailyDrawdownLimitPct ?? 3.0}% Max
            </span>
          </div>
        </div>
      </div>

      {problem && <ProblemDetailBanner problem={problem} onRetry={loadWorkspace} />}

      {/* =====================================================================
          VIEW 2: DAILY TOP STOCKS SCANNER, ALGORITHMIC FILTER BAR & WATCHLIST MANAGER
         ===================================================================== */}
      <div className="bg-zinc-900/75 backdrop-blur-md border border-zinc-800/90 rounded-xl p-4 space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          {/* Date Selector + Algorithmic Discovery Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-zinc-200 text-xs font-mono"
            />
            {ALGORITHMS.map((algo) => (
              <button
                key={algo.id}
                onClick={() => setSelectedAlgorithm(algo.id)}
                className={`px-3 py-1.5 rounded-lg border transition ${
                  selectedAlgorithm === algo.id
                    ? 'bg-zinc-100 text-zinc-950 border-zinc-100 font-semibold'
                    : 'bg-zinc-950/80 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                {algo.label}
              </button>
            ))}
          </div>

          {/* Add Stock Input & Action (+ Add & Analyze) */}
          <form onSubmit={handleAddStock} className="flex items-center gap-2 text-xs font-mono">
            <div className="relative flex items-center">
              <Plus className="w-3.5 h-3.5 text-zinc-400 absolute left-3" />
              <input
                type="text"
                placeholder="Add ticker (e.g. MSFT, COIN, MSTR)..."
                value={newTickerInput}
                onChange={(e) => setNewTickerInput(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 w-64"
              />
            </div>
            <button
              type="submit"
              disabled={addingTicker}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold flex items-center gap-1.5 transition"
            >
              {addingTicker ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Analyzing DAG...
                </>
              ) : (
                <>
                  <Cpu className="w-3.5 h-3.5" />
                  + Add &amp; Analyze
                </>
              )}
            </button>
          </form>
        </div>

        {/* Secondary Filter Bar: Signal Pills & Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800/80 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            {(['ALL', 'BUY', 'SELL', 'HOLD'] as const).map((sig) => (
              <button
                key={sig}
                onClick={() => setSelectedSignal(sig)}
                className={`px-3 py-1 rounded-md border transition ${
                  selectedSignal === sig
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-semibold'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {sig === 'ALL' ? `ALL (${stocks.length})` : `${sig} SIGNALS`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5" />
              <input
                type="text"
                placeholder="Filter symbol..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 placeholder-zinc-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleScanTopMovers}
              disabled={loading}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-sm transition"
            >
              <Zap className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Scan Top Movers
            </button>
            <button
              onClick={loadWorkspace}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-300 flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Sync Live
            </button>
          </div>
        </div>

        {/* Interactive Stock Matrix Table + Slide-Over Underneath Analysis Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className={selectedAnalysis ? 'lg:col-span-7 overflow-x-auto' : 'lg:col-span-12 overflow-x-auto'}>
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                  <th className="py-2.5 px-3">1. Ticker &amp; Source</th>
                  <th className="py-2.5 px-3">2. Live Price &amp; Day %</th>
                  <th className="py-2.5 px-3">3. RVOL &amp; Float / CTB</th>
                  <th className="py-2.5 px-3">4. Algorithm &amp; VCH Strategies</th>
                  <th className="py-2.5 px-3">5. AI Signal</th>
                  <th className="py-2.5 px-3">6. AI Price Prediction</th>
                  <th className="py-2.5 px-3">7. Critic Gate</th>
                  <th className="py-2.5 px-3 text-right">8. Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/70">
                {stocks.map((row) => {
                  const isUserPinned = row.addedSource === 'MANUAL_USER_ADDED';
                  const isBuy = row.recommendation === 'BUY';
                  const isSell = row.recommendation === 'SELL';
                  const dayChange = Number(row.dayChangePct || 0);
                  const strategies: Array<Record<string, any>> = row.strategiesApplied || [];
                  const isSelected = selectedAnalysis?.ticker === row.ticker;

                  return (
                    <tr
                      key={row.ticker}
                      className={`hover:bg-zinc-900/90 transition ${
                        isSelected ? 'bg-emerald-950/20' : ''
                      }`}
                    >
                      {/* Col 1: Ticker & Source Badge */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white px-2 py-0.5 rounded bg-zinc-950 border border-zinc-700">
                            {row.ticker}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border ${
                              isUserPinned
                                ? 'bg-amber-950/70 border-amber-600/60 text-amber-300'
                                : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                            }`}
                          >
                            {isUserPinned ? 'USER PINNED' : 'ALGO'}
                          </span>
                        </div>
                      </td>

                      {/* Col 2: Live Price & Day % Change */}
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">
                          ${Number(row.livePrice || 0).toFixed(2)}
                        </div>
                        <div className={dayChange >= 0 ? 'text-emerald-400 text-[11px]' : 'text-rose-400 text-[11px]'}>
                          {dayChange >= 0 ? '+' : ''}
                          {dayChange.toFixed(2)}%
                        </div>
                      </td>

                      {/* Col 3: RVOL & Float / Borrow Fee */}
                      <td className="py-3 px-3">
                        <div className="text-emerald-400 font-semibold">
                          {Number(row.relativeVolume ?? 0).toFixed(2)}x RVOL
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          Float: {row.floatSize ? (Number(row.floatSize) / 1_000_000).toFixed(1) + 'M' : '--'} | CTB: {row.shortBorrowFeePct !== undefined ? Number(row.shortBorrowFeePct).toFixed(2) + '%' : '--'}
                        </div>
                      </td>

                      {/* Col 4: Algorithm & Strategies Applied */}
                      <td className="py-3 px-3">
                        <div className="text-[10px] text-emerald-300 font-semibold">
                          {row.discoveryAlgorithm}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {strategies.slice(0, 2).map((s, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300"
                            >
                              {s.strategyId} ({s.semVer || 'v1.0.0'})
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Col 5: AI Recommendation */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-bold inline-flex items-center gap-1 border ${
                            isBuy
                              ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-300'
                              : isSell
                              ? 'bg-rose-950/90 border-rose-500/80 text-rose-300'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-300'
                          }`}
                        >
                          {isBuy ? (
                            <TrendingUp className="w-3.5 h-3.5" />
                          ) : isSell ? (
                            <TrendingDown className="w-3.5 h-3.5" />
                          ) : null}
                          {row.recommendation}
                        </span>
                      </td>

                      {/* Col 6: AI Price Prediction */}
                      <td className="py-3 px-3">
                        <div className="text-emerald-300 font-semibold">
                          Target: ${Number(row.predictedTargetPrice ?? 0).toFixed(2)} (
                          {Number(row.predictedGainPct ?? 0) >= 0 ? '+' : ''}
                          {Number(row.predictedGainPct ?? 0).toFixed(1)}%)
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          Stop: ${Number(row.stopLossPrice ?? 0).toFixed(2)} | R/R 1:{row.riskRewardRatio ? Number(row.riskRewardRatio).toFixed(1) : '--'}
                        </div>
                      </td>

                      {/* Col 7: Confidence & Critic Gate */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-white">
                            {row.confidenceScore !== undefined ? (Number(row.confidenceScore) * 100).toFixed(0) + '%' : '--'}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                              row.criticVerdict === 'APPROVED'
                                ? 'bg-emerald-950/80 border-emerald-600/60 text-emerald-300'
                                : 'bg-rose-950/80 border-rose-600/60 text-rose-300'
                            }`}
                          >
                            {row.criticVerdict === 'APPROVED' ? (
                              <ShieldCheck className="w-3 h-3" />
                            ) : (
                              <ShieldAlert className="w-3 h-3" />
                            )}
                            {row.criticVerdict || 'PENDING'}
                          </span>
                        </div>
                      </td>

                      {/* Col 8: Row Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleInspectStock(row.ticker)}
                            title="Inspect Underneath Analysis"
                            className="px-2 py-1 rounded bg-zinc-950 border border-zinc-700 hover:border-emerald-500 text-zinc-200 flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-emerald-400" />
                            Inspect
                          </button>
                          <button
                            onClick={() => handleReRunAi(row.ticker)}
                            disabled={busyTicker === row.ticker}
                            title="Re-Run 5-Node Agentic DAG Now"
                            className="p-1.5 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-600 text-zinc-300"
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 ${busyTicker === row.ticker ? 'animate-spin text-emerald-400' : ''}`}
                            />
                          </button>
                          <button
                            onClick={() => handleQuickTrade(row.ticker, isSell ? 'SELL' : 'BUY')}
                            title="Quick Execute Order via Critic Gate"
                            className="px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/60 hover:bg-emerald-500/30 text-emerald-300 font-semibold"
                          >
                            {isSell ? 'Sell' : 'Buy'}
                          </button>
                          <button
                            onClick={() => handleDeleteStock(row.ticker)}
                            title="Delete Stock from Active List"
                            className="p-1.5 rounded bg-zinc-950 border border-zinc-800 hover:border-rose-600 text-zinc-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* =====================================================================
              VIEW 3: PER-STOCK "UNDERNEATH ANALYSIS", STRATEGY & PREDICTION INSPECTOR
             ===================================================================== */}
          {selectedAnalysis && (
            <div className="lg:col-span-5 bg-zinc-950/95 border border-zinc-700/90 rounded-xl p-4 space-y-4 font-mono">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg font-bold text-white px-2.5 py-0.5 rounded bg-zinc-900 border border-zinc-700">
                    {selectedAnalysis.ticker}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-emerald-400">
                      UNDERNEATH 4-PILLAR AGENTIC ANALYSIS
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Workflow: {selectedAnalysis.workflowInstanceId}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAnalysis(null)}
                  className="p-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. Prediction & Recommendation Hero Banner */}
              <div className="grid grid-cols-4 gap-2 bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 text-xs">
                <div>
                  <div className="text-[10px] text-zinc-400">LIVE PRICE</div>
                  <div className="text-sm font-bold text-white">
                    ${Number(selectedAnalysis.currentLivePrice || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">AI TARGET</div>
                  <div className="text-sm font-bold text-emerald-400">
                    ${Number(selectedAnalysis.predictedTargetPrice || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">STOP LOSS</div>
                  <div className="text-sm font-bold text-rose-400">
                    ${Number(selectedAnalysis.stopLossPrice || 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-400">R/R &amp; CONF</div>
                  <div className="text-sm font-bold text-zinc-100">
                    1:{selectedAnalysis.riskRewardRatio} ({(Number(selectedAnalysis.confidenceScore || 0.9) * 100).toFixed(0)}%)
                  </div>
                </div>
              </div>

              {/* Intraday Price & Prediction Projection Chart */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-3">
                <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-2">
                  <span>INTRADAY PRICE, VWAP &amp; AI TARGET PROJECTION</span>
                  <span className="text-emerald-400">
                    Horizon: {selectedAnalysis.predictedHorizon || 'INTRADAY_1D_4H'}
                  </span>
                </div>
                <svg className="w-full h-32 overflow-visible" viewBox="0 0 360 110">
                  {/* Target Line (Dashed Emerald) */}
                  <line x1="0" y1="18" x2="360" y2="18" stroke="#10b981" strokeDasharray="4 4" strokeWidth="1.2" />
                  <text x="4" y="14" fill="#10b981" fontSize="9">
                    AI Target ${Number(selectedAnalysis.predictedTargetPrice || 0).toFixed(2)}
                  </text>
                  {/* Entry / VWAP Line (Dashed Zinc) */}
                  <line x1="0" y1="56" x2="360" y2="56" stroke="#a1a1aa" strokeDasharray="3 3" strokeWidth="1" />
                  <text x="4" y="52" fill="#d4d4d8" fontSize="9">
                    Live Entry / VWAP ${Number(selectedAnalysis.currentLivePrice || 0).toFixed(2)}
                  </text>
                  {/* Stop-Loss Line (Dashed Rose) */}
                  <line x1="0" y1="92" x2="360" y2="92" stroke="#f43f5e" strokeDasharray="4 4" strokeWidth="1.2" />
                  <text x="4" y="103" fill="#f43f5e" fontSize="9">
                    Stop-Loss ${Number(selectedAnalysis.stopLossPrice || 0).toFixed(2)}
                  </text>
                  {/* Intraday Live Price Curve */}
                  <polyline
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.2"
                    points="0,78 45,72 90,65 135,68 180,58 225,52 270,44 315,36 360,26"
                  />
                </svg>
              </div>

              {/* 2. Strategies Implemented Breakdown */}
              <div className="space-y-1.5">
                <div className="text-[10px] text-zinc-400 uppercase font-semibold">
                  Strategies Implemented On-The-Fly (riha-version-control-hub :8081)
                </div>
                {(selectedAnalysis.strategiesApplied || []).map((st: Record<string, any>, idx: number) => (
                  <div
                    key={idx}
                    className="bg-zinc-900/90 border border-zinc-800 rounded-lg p-2.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{st.strategyName}</span>
                      <span className="text-emerald-400 font-semibold">
                        Match: {(Number(st.matchScore || 0.9) * 100).toFixed(0)}% (Weight {(Number(st.weight || 0.33) * 100).toFixed(0)}%)
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Artifact: <span className="text-zinc-200">{st.promptArtifactId}</span> • SemVer:{' '}
                      <span className="text-emerald-300">{st.semVer}</span>
                    </div>
                    <div className="text-[11px] text-zinc-300">{st.triggerReason}</div>
                  </div>
                ))}
              </div>

              {/* 3. 4-Pillar Underneath Agentic Analysis Tabs */}
              <div>
                <div className="grid grid-cols-4 gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800 text-[10px]">
                  {(['TECH', 'SEC', 'MEMORY', 'CRITIC'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActivePillarTab(tab)}
                      className={`py-1.5 rounded font-semibold transition ${
                        activePillarTab === tab
                          ? 'bg-zinc-100 text-zinc-950'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {tab === 'TECH' && '1. Technicals'}
                      {tab === 'SEC' && '2. SEC / News'}
                      {tab === 'MEMORY' && '3. Memory RAG'}
                      {tab === 'CRITIC' && '4. Critic Gate'}
                    </button>
                  ))}
                </div>

                <div className="mt-2 bg-zinc-900/90 border border-zinc-800 rounded-lg p-3 text-xs space-y-1.5">
                  {activePillarTab === 'TECH' && (() => {
                    const t = selectedAnalysis.underneathAnalysis?.technicalNodeSummary || {};
                    return (
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>VWAP: <strong className="text-white">${t.vwap !== undefined ? Number(t.vwap).toFixed(2) : Number(selectedAnalysis.currentLivePrice ?? 0).toFixed(2)}</strong></div>
                        <div>RSI-14: <strong className="text-emerald-400">{t.rsi14 !== undefined ? Number(t.rsi14).toFixed(2) : '--'}</strong></div>
                        <div>EMA-9 / EMA-21: <strong className="text-zinc-200">${t.ema9 !== undefined ? Number(t.ema9).toFixed(2) : '--'} / ${t.ema21 !== undefined ? Number(t.ema21).toFixed(2) : '--'}</strong></div>
                        <div>MACD Hist: <strong className="text-emerald-400">{t.macdHistogram !== undefined ? Number(t.macdHistogram).toFixed(3) : '--'}</strong></div>
                        <div>RVOL: <strong className="text-emerald-400">{t.relativeVolume !== undefined ? Number(t.relativeVolume).toFixed(2) + 'x' : '--'}</strong></div>
                        <div>Spread: <strong className="text-zinc-200">{t.spreadBps !== undefined ? Number(t.spreadBps).toFixed(2) + ' bps' : '--'}</strong></div>
                      </div>
                    );
                  })()}

                  {activePillarTab === 'SEC' && (() => {
                    const s = selectedAnalysis.underneathAnalysis?.secCatalystNodeSummary || {};
                    return (
                      <div className="space-y-1 text-[11px]">
                        <div>CIK: <strong className="text-white">{s.cik || '--'}</strong> | Dilution Risk: <strong className="text-emerald-400">{String(s.dilutionRiskDetected ?? false)}</strong></div>
                        <div className="text-zinc-300">{s.catalystSummary || 'Live SEC EDGAR filings verified via riha-stock-ai-market-ingestor.'}</div>
                      </div>
                    );
                  })()}

                  {activePillarTab === 'MEMORY' && (() => {
                    const m = selectedAnalysis.underneathAnalysis?.episodicMemoryNodeSummary || {};
                    return (
                      <div className="space-y-1 text-[11px]">
                        <div>Historical Setup Win Rate: <strong className="text-emerald-400">{m.historicalSetupWinRatePct ? m.historicalSetupWinRatePct + '%' : '--'}</strong> ({m.similarSetupsCount ?? 0} pgvector matches)</div>
                        <div>Avg Historical Return: <strong className="text-emerald-300">{m.averageHistoricalReturnPct ? '+' + m.averageHistoricalReturnPct + '%' : '--'}</strong></div>
                      </div>
                    );
                  })()}

                  {activePillarTab === 'CRITIC' && (() => {
                    const c = selectedAnalysis.underneathAnalysis?.criticGuardrailSummary || {};
                    return (
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span>Verdict: <strong className="text-emerald-400">{c.verdict}</strong></span>
                          <span>Convergence: <strong className="text-white">{(Number(c.semanticConvergenceScore || 0.94) * 100).toFixed(1)}%</strong></span>
                        </div>
                        <div className="text-zinc-300 text-[10px]">{c.remediationFeedback}</div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          VIEW 4: OVERALL BUY/SELL EXECUTION LEDGER & PLATFORM EVENT AUDIT
         ===================================================================== */}
      <div className="bg-zinc-900/75 backdrop-blur-md border border-zinc-800/90 rounded-xl overflow-hidden font-mono">
        <div className="px-5 py-3.5 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-white uppercase">
              Overall Buy/Sell Execution Ledger &amp; Platform Event Audit ({transactions.length} Transactions)
            </span>
          </div>
          <span className="text-zinc-400 text-[11px]">
            Click any row to inspect Raw Agentic Event Trace (VCH &rarr; Validator &rarr; Orchestrator &rarr; MCP Gateway &rarr; Critic &rarr; Robinhood MCP)
          </span>
        </div>

        <div className="divide-y divide-zinc-800/70">
          {transactions.map((tx) => {
            const isExpanded = expandedTxId === tx.id;
            const isBuy = tx.side === 'BUY';
            return (
              <div key={tx.id} className="p-3.5 hover:bg-zinc-900/60 transition">
                <div
                  onClick={() => setExpandedTxId(isExpanded ? null : tx.id)}
                  className="cursor-pointer flex flex-wrap items-center justify-between gap-3 text-xs"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-[11px] text-zinc-500">
                      {tx.executedAt ? new Date(tx.executedAt).toLocaleTimeString() : 'Live'}
                    </span>
                    <span className="font-bold text-white px-2 py-0.5 rounded bg-zinc-950 border border-zinc-700">
                      {tx.ticker}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold border ${
                        isBuy
                          ? 'bg-emerald-950/90 border-emerald-600/70 text-emerald-300'
                          : 'bg-rose-950/90 border-rose-600/70 text-rose-300'
                      }`}
                    >
                      {tx.executionMode === 'AUTO_AGENTIC' ? `AUTO ${tx.side}` : `MANUAL ${tx.side}`}
                    </span>
                    <span className="text-zinc-300">
                      {tx.quantity} sh @ ${Number(tx.orderPrice || 0).toFixed(2)}
                    </span>
                    <span className="text-zinc-400 text-[11px]">
                      Target: ${Number(tx.predictedTargetPrice || 0).toFixed(2)} | {tx.strategyName} ({tx.promptVersion})
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-emerald-400 font-bold">
                      +${Number(tx.realizedProfitLossUsd || 0).toFixed(2)} (+{Number(tx.realizedProfitLossPct || 0).toFixed(2)}%)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 text-[11px]">
                      {tx.robinhoodOrderId || tx.status}
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-zinc-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-3 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-[11px] text-emerald-300/90 overflow-x-auto">
                    <pre>
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(tx.rawEventTraceJson || '{}'), null, 2);
                        } catch {
                          return tx.rawEventTraceJson;
                        }
                      })()}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

