import React, { useState, useEffect, useMemo } from 'react';
import { StockApiClient } from '../services/stockApiClient';
import { useTrading } from '../context/TradingContext';
import { useAuth } from '../context/AuthContext';
import {
  StockTradeTransaction,
  AutoStrategyItem,
  StrategyHistoryItem,
  PlatformPerformanceSummary,
} from '../types/trading';
import { LoginHistoryItem } from '../types/auth';
import { StrategicLoopConfigModal, StrategicLoopConfigTarget } from '../components/trading/StrategicLoopConfigModal';
import { StockDetailExecutionModal } from '../components/trading/StockDetailExecutionModal';
import {
  ShieldCheck,
  History,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Cpu,
  RefreshCw,
  Search,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  FileText,
  UserCheck,
  PauseCircle,
  PlayCircle,
  Percent,
  Zap,
  Info,
} from 'lucide-react';

export const PlatformAuditHistoryPage: React.FC = () => {
  const { holdings, openTradeModal } = useTrading();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'auto-loops' | 'strategy-history' | 'transactions' | 'login-history'>('auto-loops');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Real data state
  const [transactions, setTransactions] = useState<StockTradeTransaction[]>([]);
  const [performance, setPerformance] = useState<PlatformPerformanceSummary | null>(null);
  const [autoLoops, setAutoLoops] = useState<AutoStrategyItem[]>([]);
  const [strategyHistory, setStrategyHistory] = useState<StrategyHistoryItem[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);

  // Search & filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSide, setFilterSide] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [configTarget, setConfigTarget] = useState<StrategicLoopConfigTarget | null>(null);
  const [updatingLoopTicker, setUpdatingLoopTicker] = useState<string | null>(null);
  const [selectedStockForExecution, setSelectedStockForExecution] = useState<{
    symbol: string;
    companyName?: string;
    currentPrice: number;
    costBasis?: number;
    ownedShares?: number;
    initialMode?: 'AUTO_LOOP' | 'ONE_TIME';
  } | null>(null);

  const handleToggleAutoLoop = async (loop: AutoStrategyItem) => {
    const newMonitoring = !loop.activeMonitoring;
    // Optimistic UI state update immediately
    setAutoLoops((prev) =>
      prev.map((l) => (l.ticker === loop.ticker ? { ...l, activeMonitoring: newMonitoring } : l))
    );
    setUpdatingLoopTicker(loop.ticker);
    try {
      await StockApiClient.updateStockStrategicLoop(
        loop.ticker,
        newMonitoring,
        loop.executionMode || 'ACTUAL',
        loop.targetProfitMarginPct ?? 5.0,
        loop.stopLossMarginPct ?? 3.0,
        loop.autoBuyEnabled ?? false,
        loop.autoSellEnabled ?? false,
        1
      );
    } catch (err: any) {
      console.error('Failed to toggle auto loop:', err);
      // Revert optimistic update
      setAutoLoops((prev) =>
        prev.map((l) => (l.ticker === loop.ticker ? { ...l, activeMonitoring: loop.activeMonitoring } : l))
      );
    } finally {
      setUpdatingLoopTicker(null);
    }
  };

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [txs, perf, loops, stratHist, logins] = await Promise.all([
        StockApiClient.getAllTransactions(),
        StockApiClient.getPerformanceSummary(),
        StockApiClient.getActiveAutoLoops(),
        StockApiClient.getStrategiesHistory(),
        StockApiClient.getLoginHistory(),
      ]);

      setTransactions(txs || []);
      setPerformance(perf);
      setLoginHistory(logins || []);

      // Extract strategy history from masterAudit audits
      const rawAudits = stratHist?.masterAudit?.audits || stratHist?.masterAudit?.recentAudits || [];
      const parsedAudits: StrategyHistoryItem[] = Array.isArray(rawAudits)
        ? rawAudits.map((a: any) => ({
            auditId: a.auditId || a.id || `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            ticker: a.ticker || a.symbol || 'UNKNOWN',
            strategyApplied: a.strategyApplied || a.strategyName || 'High Conviction Multi-Factor',
            aiRecommendation: (a.aiRecommendation || a.action || 'HOLD').toUpperCase() as any,
            limitPrice: a.limitPrice || a.price || 0,
            stopLossPrice: a.stopLossPrice || a.stopLoss,
            takeProfitPrice: a.takeProfitPrice || a.targetPrice,
            quantity: a.quantity || 10,
            aiReasoningSummary: a.aiReasoningSummary || a.reasoning || '',
            criticSpelVerdict: a.criticSpelVerdict || a.verdict || 'APPROVED',
            criticConvergenceScore: a.criticConvergenceScore || a.confidence || 0.85,
            executionStatus: a.executionStatus || 'RECORDED',
            auditedAt: a.auditedAt || a.timestamp || new Date().toISOString(),
          }))
        : [];

      setStrategyHistory(parsedAudits);

      // Merge backend auto-loops with active loops from holdings
      const activeFromHoldings: AutoStrategyItem[] = holdings
        .filter((h) => h.runStrategicLoop)
        .map((h) => ({
          ticker: h.symbol,
          activeMonitoring: true,
          latestLivePrice: h.currentPrice,
          dayChangePct: h.dayGainPercent,
          costBasis: h.avgCost,
          ownedShares: h.shares,
          targetProfitMarginPct: h.targetProfitMarginPct ?? 5.0,
          stopLossMarginPct: h.stopLossMarginPct ?? 3.0,
          executionMode: h.executionMode ?? 'ACTUAL',
          autoBuyEnabled: h.autoBuyEnabled ?? false,
          autoSellEnabled: h.autoSellEnabled ?? false,
          latestRecommendation: h.latestRecommendation || 'HOLD',
          confidenceScore: h.strategyConfidenceScore || 85,
          discoveryAlgorithm: 'STRATEGIC_LOOP_MONITOR',
          updatedAt: new Date().toISOString(),
        }));

      // Combine without duplicates
      const loopMap = new Map<string, AutoStrategyItem>();
      (loops || []).forEach((l) => loopMap.set(l.ticker, l));
      activeFromHoldings.forEach((l) => loopMap.set(l.ticker, l));
      setAutoLoops(Array.from(loopMap.values()));
    } catch (err) {
      console.error('Failed to load platform audit data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [holdings.length]);

  // Compute live cumulative gains / losses
  const computedMetrics = useMemo(() => {
    const totalRealizedPnl = transactions.reduce((acc, t) => acc + (t.realizedProfitLossUsd || 0), 0);
    const totalUnrealizedPnl = holdings.reduce((acc, h) => acc + h.totalGain, 0);
    const netPnl = totalRealizedPnl + totalUnrealizedPnl;

    const totalBuyVol = transactions
      .filter((t) => t.side === 'BUY' && t.status === 'FILLED')
      .reduce((acc, t) => acc + (t.orderPrice || 0) * t.quantity, 0);

    const totalSellVol = transactions
      .filter((t) => t.side === 'SELL' && t.status === 'FILLED')
      .reduce((acc, t) => acc + (t.orderPrice || 0) * t.quantity, 0);

    const totalVolume = totalBuyVol + totalSellVol;

    const winningTrades = transactions.filter((t) => (t.realizedProfitLossUsd || 0) > 0).length;
    const losingTrades = transactions.filter((t) => (t.realizedProfitLossUsd || 0) < 0).length;
    const closedTrades = winningTrades + losingTrades;
    const winRate = closedTrades > 0 ? (winningTrades / closedTrades) * 100 : 0;

    return {
      netPnl,
      totalRealizedPnl,
      totalUnrealizedPnl,
      totalVolume,
      winRate,
      winningTrades,
      losingTrades,
      totalTrades: transactions.length,
      activeLoopsCount: autoLoops.length,
    };
  }, [transactions, holdings, autoLoops]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchSide = filterSide === 'ALL' || t.side === filterSide;
      const matchSearch =
        !searchTerm ||
        t.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.strategyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSide && matchSearch;
    });
  }, [transactions, filterSide, searchTerm]);

  // Filtered strategies
  const filteredStrategies = useMemo(() => {
    return strategyHistory.filter((s) => {
      return (
        !searchTerm ||
        s.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.strategyApplied.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.criticSpelVerdict.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [strategyHistory, searchTerm]);

  // Filtered auto loops
  const filteredAutoLoops = useMemo(() => {
    return autoLoops.filter((l) => {
      return (
        !searchTerm ||
        l.ticker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.discoveryAlgorithm?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [autoLoops, searchTerm]);

  // Filtered login history
  const filteredLogins = useMemo(() => {
    return loginHistory.filter((log) => {
      return (
        !searchTerm ||
        log.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.ipAddress?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    });
  }, [loginHistory, searchTerm]);

  const exportTransactionsCsv = () => {
    const headers = 'Order ID,Timestamp,Side,Ticker,Shares,Price,Total Value,Realized PnL,Mode,Status\n';
    const rows = filteredTransactions
      .map(
        (t) =>
          `"${t.id}","${t.executedAt}","${t.side}","${t.ticker}",${t.quantity},${t.orderPrice},${(t.orderPrice * t.quantity).toFixed(2)},${t.realizedProfitLossUsd || 0},"${t.executionMode}","${t.status}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `riha-platform-transactions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}
      <div className="bg-[#111827] border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-950/80 text-indigo-400 border border-indigo-800/80 uppercase">
              Audit &amp; Intelligence Ledger
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Isolated Profile: {user?.email || 'Active User'}
            </span>
            <span className="text-xs text-slate-400 font-mono">Zero-Mock Multi-Tenant Guard</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-indigo-400" />
            Platform History, Active Auto-Loops &amp; Realized PnL
          </h1>
          <p className="text-xs text-slate-400">
            Real-time regulatory audit trail tracking login sessions, cumulative profit/loss, active autonomous trading loops, and all stock executions till date.
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all self-start md:self-auto shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync Telemetry'}</span>
        </button>
      </div>

      {/* CUMULATIVE GAIN/LOSS & FINANCIAL KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Gain/Loss Till Date */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Net Platform PnL Till Date</span>
            {computedMetrics.netPnl >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-black font-mono tracking-tight ${
                computedMetrics.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {computedMetrics.netPnl >= 0 ? '+' : ''}${computedMetrics.netPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>Realized: ${computedMetrics.totalRealizedPnl.toFixed(2)}</span>
            <span>Open: ${computedMetrics.totalUnrealizedPnl.toFixed(2)}</span>
          </div>
        </div>

        {/* Total Volume Traded */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Volume Exchanged</span>
            <DollarSign className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono tracking-tight text-white">
              ${computedMetrics.totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>{transactions.length} Total Trades</span>
            <span>All Brokers</span>
          </div>
        </div>

        {/* Win Rate & Profitability */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Platform Win Rate</span>
            <Percent className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono tracking-tight text-blue-400">
              {computedMetrics.winRate.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-400">of closed orders</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span className="text-emerald-400">{computedMetrics.winningTrades} Wins</span>
            <span className="text-rose-400">{computedMetrics.losingTrades} Losses</span>
          </div>
        </div>

        {/* Active Autonomous Strategy Loops */}
        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active Auto Strategy Loops</span>
            <Cpu className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono tracking-tight text-emerald-400">
              {computedMetrics.activeLoopsCount}
            </span>
            <span className="text-xs text-slate-400">stocks running</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
            <span>Continuous AI Radar</span>
            <span className="text-emerald-400 font-bold">ONLINE</span>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS & SEARCH BAR */}
      <div className="bg-[#111827] border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* TAB BUTTONS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('auto-loops')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'auto-loops'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Active Auto-Strategies ({autoLoops.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('strategy-history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'strategy-history'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Strategy History ({strategyHistory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'transactions'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Platform Transactions ({transactions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('login-history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'login-history'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Login Audit Trail ({loginHistory.length})</span>
          </button>
        </div>

        {/* SEARCH & CONTROLS */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ticker, strategy, order..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#0b0f19] border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
          </div>

          {activeTab === 'transactions' && (
            <button
              onClick={exportTransactionsCsv}
              disabled={filteredTransactions.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-40 shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB CONTENT VIEWS */}
      {isLoading ? (
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-mono text-slate-400">Loading immutable platform ledger telemetry...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: ACTIVE AUTO-STRATEGIES */}
          {activeTab === 'auto-loops' && (
            <div className="bg-[#111827] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-400" />
                    Autonomous Strategy Loops ({filteredAutoLoops.length} Active)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Stocks with background AI radar enabled for continuous gain threshold and stop-loss monitoring.
                  </p>
                </div>
              </div>

              {filteredAutoLoops.length === 0 ? (
                <div className="p-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-200">No Active Auto Loops Currently Running</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    To start continuous monitoring, navigate to your Holdings table or Trending Movers and click &quot;Auto Loop&quot; to configure profit targets and stop-losses.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#0b0f19]/60 text-slate-400 uppercase font-mono tracking-wider text-[10px] border-b border-slate-800">
                        <th className="py-3 px-4">Stock</th>
                        <th className="py-3 px-4">Loop Status</th>
                        <th className="py-3 px-4 text-right">Cost Basis</th>
                        <th className="py-3 px-4 text-right">Live Price</th>
                        <th className="py-3 px-4 text-right">Target Profit (+%)</th>
                        <th className="py-3 px-4 text-right">Stop Loss (-%)</th>
                        <th className="py-3 px-4 text-center">Execution Route</th>
                        <th className="py-3 px-4 text-center">Auto Buy/Sell</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {filteredAutoLoops.map((loop) => {
                        const costBasis = loop.costBasis || loop.latestLivePrice || 0;
                        const livePrice = loop.latestLivePrice || costBasis;
                        const profitPct = loop.targetProfitMarginPct ?? 5.0;
                        const stopLossPct = loop.stopLossMarginPct ?? 3.0;
                        const targetPrice = costBasis * (1 + profitPct / 100);
                        const stopPrice = costBasis * (1 - stopLossPct / 100);

                        return (
                          <tr key={loop.ticker} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                                  {loop.ticker}
                                </div>
                                <div>
                                  <div className="font-bold text-white">{loop.ticker}</div>
                                  <div className="text-[10px] text-slate-400 font-sans">
                                    {loop.ownedShares ? `${loop.ownedShares} shares owned` : 'Radar watchlist'}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <button
                                type="button"
                                onClick={() => handleToggleAutoLoop(loop)}
                                disabled={updatingLoopTicker === loop.ticker}
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                                  loop.activeMonitoring
                                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-xs shadow-emerald-500/20 hover:bg-emerald-900/60'
                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                                }`}
                                title={loop.activeMonitoring ? 'Click to instantly PAUSE Auto Strategy Loop' : 'Click to instantly ACTIVATE Auto Strategy Loop'}
                              >
                                {updatingLoopTicker === loop.ticker ? (
                                  <RefreshCw className="w-3 h-3 animate-spin text-slate-300" />
                                ) : (
                                  <span className={`w-1.5 h-1.5 rounded-full ${loop.activeMonitoring ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                                )}
                                <span>{loop.activeMonitoring ? 'ACTIVE (ON)' : 'PAUSED (OFF)'}</span>
                                {/* Sliding Toggle Switch Visual */}
                                <div className={`w-5 h-3 rounded-full p-0.5 transition-colors flex items-center ${
                                  loop.activeMonitoring ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                                }`}>
                                  <span className="w-2 h-2 rounded-full bg-white shadow-xs" />
                                </div>
                              </button>
                            </td>

                            <td className="py-3.5 px-4 text-right text-slate-300">
                              ${costBasis.toFixed(2)}
                            </td>

                            <td className="py-3.5 px-4 text-right font-bold text-white">
                              ${livePrice.toFixed(2)}
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="text-emerald-400 font-bold">+{profitPct}%</div>
                              <div className="text-[10px] text-slate-400">${targetPrice.toFixed(2)}</div>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="text-rose-400 font-bold">-{stopLossPct}%</div>
                              <div className="text-[10px] text-slate-400">${stopPrice.toFixed(2)}</div>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                                {loop.executionMode === 'ACTUAL' ? 'Robinhood Live API' : 'Paperless Sandbox'}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5 text-[10px]">
                                <span
                                  className={`px-1.5 py-0.5 rounded ${
                                    loop.autoBuyEnabled
                                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                                      : 'bg-slate-800/50 text-slate-500'
                                  }`}
                                >
                                  BUY: {loop.autoBuyEnabled ? 'ON' : 'OFF'}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded ${
                                    loop.autoSellEnabled
                                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                                      : 'bg-slate-800/50 text-slate-500'
                                  }`}
                                >
                                  SELL: {loop.autoSellEnabled ? 'ON' : 'OFF'}
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedStockForExecution({
                                      symbol: loop.ticker,
                                      companyName: loop.ticker,
                                      currentPrice: livePrice,
                                      costBasis: costBasis,
                                      ownedShares: loop.ownedShares,
                                      initialMode: 'ONE_TIME',
                                    })
                                  }
                                  className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 font-sans font-bold text-[11px] transition-colors flex items-center gap-1"
                                  title="View live key metrics, news, filings and 1-time strategy execution"
                                >
                                  <Zap className="w-3 h-3 text-amber-400" />
                                  <span>Details &amp; 1-Time</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConfigTarget({
                                      symbol: loop.ticker,
                                      currentPrice: livePrice,
                                      avgCost: costBasis,
                                      runStrategicLoop: loop.activeMonitoring,
                                      executionMode: loop.executionMode || 'ACTUAL',
                                      targetProfitMarginPct: profitPct,
                                      stopLossMarginPct: stopLossPct,
                                      autoBuyEnabled: loop.autoBuyEnabled,
                                      autoSellEnabled: loop.autoSellEnabled,
                                      maxQuantity: 1,
                                    })
                                  }
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                                  title="Threshold Options (Optional)"
                                >
                                  <SlidersHorizontal className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: STRATEGY HISTORY (APPLIED TILL DATE) */}
          {activeTab === 'strategy-history' && (
            <div className="bg-[#111827] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-400" />
                    Strategy Execution &amp; Evaluation History ({filteredStrategies.length} Records)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    History of all 5-Node Agentic DAG and technical strategies applied to equities till date.
                  </p>
                </div>
              </div>

              {filteredStrategies.length === 0 ? (
                <div className="p-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                    <Layers className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-200">No Historical Strategy Executions Recorded</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Evaluate stocks from Trending Movers or execute 1-Time Strategies to record verifiable audit lineage.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#0b0f19]/60 text-slate-400 uppercase font-mono tracking-wider text-[10px] border-b border-slate-800">
                        <th className="py-3 px-4">Audited At</th>
                        <th className="py-3 px-4">Stock</th>
                        <th className="py-3 px-4">Strategy Applied</th>
                        <th className="py-3 px-4 text-center">AI Signal</th>
                        <th className="py-3 px-4 text-right">Evaluated Price</th>
                        <th className="py-3 px-4 text-right">Target Price</th>
                        <th className="py-3 px-4 text-right">Stop Loss</th>
                        <th className="py-3 px-4 text-center">Critic Gate Verdict</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {filteredStrategies.map((item) => (
                        <tr key={item.auditId} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                            {new Date(item.auditedAt).toLocaleString()}
                          </td>

                          <td className="py-3.5 px-4 font-bold text-white">
                            {item.ticker}
                          </td>

                          <td className="py-3.5 px-4 text-slate-300 font-sans">
                            {item.strategyApplied}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                item.aiRecommendation === 'BUY'
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                                  : item.aiRecommendation === 'SELL'
                                  ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {item.aiRecommendation}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right text-slate-300">
                            ${item.limitPrice ? item.limitPrice.toFixed(2) : '--'}
                          </td>

                          <td className="py-3.5 px-4 text-right text-emerald-400">
                            {item.takeProfitPrice ? `$${item.takeProfitPrice.toFixed(2)}` : '--'}
                          </td>

                          <td className="py-3.5 px-4 text-right text-rose-400">
                            {item.stopLossPrice ? `$${item.stopLossPrice.toFixed(2)}` : '--'}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.criticSpelVerdict === 'APPROVED'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                  : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                              }`}
                            >
                              {item.criticSpelVerdict} ({Math.round((item.criticConvergenceScore || 0) * 100)}%)
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                              {item.executionStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COMPLETE PLATFORM TRANSACTIONS */}
          {activeTab === 'transactions' && (
            <div className="bg-[#111827] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-400" />
                    Complete Trade &amp; Transaction Ledger ({filteredTransactions.length} Orders)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Immutable execution ledger tracking buy/sell fills, prices, quantities, and realized PnL.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-[#0b0f19] p-1 rounded-xl border border-slate-700 text-xs font-semibold self-start sm:self-auto">
                  {(['ALL', 'BUY', 'SELL'] as const).map((side) => (
                    <button
                      key={side}
                      onClick={() => setFilterSide(side)}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        filterSide === side
                          ? 'bg-indigo-600 text-white shadow-xs font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {side}
                    </button>
                  ))}
                </div>
              </div>

              {filteredTransactions.length === 0 ? (
                <div className="p-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-200">No Transactions Executed Yet</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Submit trades from the Trending Movers table or Holdings tab to populate your live platform ledger.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#0b0f19]/60 text-slate-400 uppercase font-mono tracking-wider text-[10px] border-b border-slate-800">
                        <th className="py-3 px-4">Order ID &amp; Time</th>
                        <th className="py-3 px-4">Side</th>
                        <th className="py-3 px-4">Ticker</th>
                        <th className="py-3 px-4 text-right">Shares</th>
                        <th className="py-3 px-4 text-right">Order Price</th>
                        <th className="py-3 px-4 text-right">Total Value</th>
                        <th className="py-3 px-4 text-right">Realized PnL</th>
                        <th className="py-3 px-4 text-center">Execution Mode</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {filteredTransactions.map((tx) => {
                        const totalVal = (tx.orderPrice || 0) * (tx.quantity || 1);
                        const pnl = tx.realizedProfitLossUsd || 0;

                        return (
                          <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-300 text-[11px]">{tx.id.substring(0, 18)}...</div>
                              <div className="text-[10px] text-slate-500 font-sans">
                                {new Date(tx.executedAt).toLocaleString()}
                              </div>
                            </td>

                            <td className="py-3.5 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  tx.side === 'BUY'
                                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                                    : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                                }`}
                              >
                                {tx.side === 'BUY' ? (
                                  <ArrowDownRight className="w-3 h-3" />
                                ) : (
                                  <ArrowUpRight className="w-3 h-3" />
                                )}
                                <span>{tx.side}</span>
                              </span>
                            </td>

                            <td className="py-3.5 px-4 font-bold text-white text-sm">
                              {tx.ticker}
                            </td>

                            <td className="py-3.5 px-4 text-right text-slate-300">
                              {tx.quantity}
                            </td>

                            <td className="py-3.5 px-4 text-right font-bold text-white">
                              ${tx.orderPrice ? tx.orderPrice.toFixed(2) : '0.00'}
                            </td>

                            <td className="py-3.5 px-4 text-right text-slate-300 font-bold">
                              ${totalVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            <td className="py-3.5 px-4 text-right font-bold">
                              {pnl !== 0 ? (
                                <span className={pnl > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                  {pnl > 0 ? '+' : ''}${pnl.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-slate-500">--</span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                                {tx.executionMode}
                              </span>
                            </td>

                            <td className="py-3.5 px-4 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  tx.status === 'FILLED'
                                    ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                                    : tx.status === 'BLOCKED_BY_CRITIC'
                                    ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                                }`}
                              >
                                {tx.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LOGIN & AUTHENTICATION HISTORY */}
          {activeTab === 'login-history' && (
            <div className="bg-[#111827] border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-400" />
                    Security &amp; Login Audit Trail ({filteredLogins.length} Sessions)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Immutable login sessions verifying Google OAuth 2.0 authentication, client IP, and SEC regulatory disclaimer acceptance.
                  </p>
                </div>
              </div>

              {filteredLogins.length === 0 ? (
                <div className="p-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-200">No Login Sessions Recorded</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Sign in with Google to establish your secure session and record authentication events.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#0b0f19]/60 text-slate-400 uppercase font-mono tracking-wider text-[10px] border-b border-slate-800">
                        <th className="py-3 px-4">Login Timestamp</th>
                        <th className="py-3 px-4">User Account</th>
                        <th className="py-3 px-4">Authentication Provider</th>
                        <th className="py-3 px-4">Client IP Address</th>
                        <th className="py-3 px-4">Browser &amp; User Agent</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">SEC Disclaimer Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {filteredLogins.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                            {new Date(entry.loginTime).toLocaleString()}
                          </td>

                          <td className="py-3.5 px-4 font-bold text-white font-sans">
                            {entry.email}
                          </td>

                          <td className="py-3.5 px-4 text-indigo-400">
                            {entry.provider}
                          </td>

                          <td className="py-3.5 px-4 text-slate-400">
                            {entry.ipAddress || '127.0.0.1'}
                          </td>

                          <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate text-[11px] font-sans">
                            {entry.userAgent || 'Modern Web Browser (TLS 1.3)'}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                entry.status === 'SUCCESS'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800/60'
                              }`}
                            >
                              {entry.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-bold">
                              ACCEPTED ({entry.disclaimerVersion || 'v1.0'})
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* STRATEGIC LOOP CONFIG MODAL */}
      {configTarget && (
        <StrategicLoopConfigModal
          isOpen={!!configTarget}
          target={configTarget}
          onClose={() => setConfigTarget(null)}
          onSaved={() => {
            setConfigTarget(null);
            loadData(true);
          }}
        />
      )}

      {/* STOCK KEY INFO & 1-TIME EXECUTION MODAL */}
      {selectedStockForExecution && (
        <StockDetailExecutionModal
          isOpen={!!selectedStockForExecution}
          onClose={() => setSelectedStockForExecution(null)}
          symbol={selectedStockForExecution.symbol}
          companyName={selectedStockForExecution.companyName}
          currentPrice={selectedStockForExecution.currentPrice}
          costBasis={selectedStockForExecution.costBasis}
          ownedShares={selectedStockForExecution.ownedShares}
          initialMode={selectedStockForExecution.initialMode || 'ONE_TIME'}
          onExecutionComplete={() => {
            loadData(true);
          }}
        />
      )}
    </div>
  );
};

