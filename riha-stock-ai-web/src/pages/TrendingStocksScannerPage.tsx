import React, { useEffect, useState, useRef } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Flame,
  Lock,
  Plus,
  Radar,
  RefreshCw,
  Search,
  Zap,
} from 'lucide-react';
import { OrderTicketParams, TrendingStockItem } from '../types/stockAi';
import {
  addStockToWatchlist,
  fetchTrendingStocks,
  triggerAnalyzeStockNow,
} from '../api/stockAiClient';
import { StockRowActionIcons } from '../components/dashboard/StockRowActionIcons';
import { OrderTicketModal } from '../components/modals/OrderTicketModal';
import { StockChartDrawer } from '../components/drawers/StockChartDrawer';
import { AdvancedStrategyModal } from '../components/modals/AdvancedStrategyModal';
import { SmartBracketModal } from '../components/modals/SmartBracketModal';
import { CostBasisCalculatorModal } from '../components/modals/CostBasisCalculatorModal';
import { PositionHistoryModal } from '../components/modals/PositionHistoryModal';

interface Props {
  onNavigate: (route: string) => void;
}

const DISCOVERY_FILTERS = [
  { id: 'TOP_GAINERS_DAY', label: 'Top Gainers (1D)', icon: <Flame className="w-3.5 h-3.5 text-amber-400" /> },
  { id: 'RVOL_SURGE', label: 'Relative Volume Surge', icon: <Activity className="w-3.5 h-3.5 text-emerald-400" /> },
  { id: 'SHORT_SQUEEZE_SETUP', label: 'Short Squeeze Setup', icon: <Zap className="w-3.5 h-3.5 text-rose-400" /> },
  { id: 'VWAP_RECLAIM', label: 'VWAP Reclaim Momentum', icon: <Radar className="w-3.5 h-3.5 text-cyan-400" /> },
  { id: 'AI_HIGH_CONVICTION', label: 'AI High-Conviction (>=90%)', icon: <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" /> },
];

const REFRESH_INTERVALS = [
  { label: '5s', ms: 5000 },
  { label: '10s', ms: 10000 },
  { label: '15s', ms: 15000 },
  { label: '30s', ms: 30000 },
  { label: '1m', ms: 60000 },
  { label: '5m', ms: 300000 },
];

export const TrendingStocksScannerPage: React.FC<Props> = ({ onNavigate }) => {
  const [activeFilter, setActiveFilter] = useState<string>('TOP_GAINERS_DAY');
  const [stocks, setStocks] = useState<TrendingStockItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [newTickerInput, setNewTickerInput] = useState<string>('');
  const [addingTicker, setAddingTicker] = useState<boolean>(false);

  // Auto-Refresh Controls
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(true);
  const [intervalMs, setIntervalMs] = useState<number>(10000);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => new Date().toLocaleTimeString());
  const [countdownPct, setCountdownPct] = useState<number>(100);

  // Modals & Drawers
  const [ticketParams, setTicketParams] = useState<OrderTicketParams | null>(null);
  const [chartTicker, setChartTicker] = useState<string | null>(null);
  const [strategyTicker, setStrategyTicker] = useState<string | null>(null);
  const [bracketParams, setBracketParams] = useState<{ ticker: string; price: number; sl: number; tp: number } | null>(null);
  const [costBasisParams, setCostBasisParams] = useState<{ ticker: string; qty: number; avgCost: number; price: number } | null>(null);
  const [historyTicker, setHistoryTicker] = useState<string | null>(null);

  const fetchTrending = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const data = await fetchTrendingStocks(activeFilter, search);
      setStocks(data);
      setLastSyncedTime(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load trending stocks:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
      setCountdownPct(100);
    }
  };

  useEffect(() => {
    fetchTrending();
  }, [activeFilter]);

  // Countdown timer & auto-refresh effect
  useEffect(() => {
    if (!autoRefreshEnabled) return;
    const stepMs = 250;
    const totalSteps = intervalMs / stepMs;
    let currentStep = totalSteps;

    const timer = setInterval(() => {
      currentStep -= 1;
      setCountdownPct(Math.max(0, (currentStep / totalSteps) * 100));
      if (currentStep <= 0) {
        currentStep = totalSteps;
        fetchTrending(true);
      }
    }, stepMs);

    return () => clearInterval(timer);
  }, [autoRefreshEnabled, intervalMs, activeFilter, search]);

  const handleAddCustomTicker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTickerInput.trim()) return;
    const sym = newTickerInput.trim().toUpperCase();
    setAddingTicker(true);
    try {
      await addStockToWatchlist(sym);
      setNewTickerInput('');
      fetchTrending();
    } catch (err: any) {
      alert(`Failed to add and analyze ticker ${sym}: ${err.message}`);
    } finally {
      setAddingTicker(false);
    }
  };

  const handleReAnalyze = async (ticker: string) => {
    try {
      await triggerAnalyzeStockNow(ticker);
      fetchTrending(true);
    } catch (err: any) {
      alert(`Re-analysis failed: ${err.message}`);
    }
  };

  const filtered = stocks.filter((s) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return s.ticker.toLowerCase().includes(term) || s.companyName?.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header & Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-white flex items-center gap-2">
            <Radar className="w-5 h-5 text-emerald-400" />
            Tab 2: Trending &amp; Algorithmic Stock Scanner
          </h1>
          <p className="text-xs font-mono text-zinc-400 mt-0.5">
            Real-time algorithmic discovery feed with deterministic position-gated order execution
          </p>
        </div>

        {/* Add Ticker Input */}
        <form onSubmit={handleAddCustomTicker} className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Add ticker (e.g. NVDA)..."
            value={newTickerInput}
            onChange={(e) => setNewTickerInput(e.target.value)}
            className="w-44 px-3 py-1.5 bg-zinc-900 border border-zinc-800 focus:border-emerald-500 rounded-lg text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={addingTicker || !newTickerInput.trim()}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-mono text-xs font-bold rounded-lg transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{addingTicker ? 'Analyzing...' : 'Add & Analyze'}</span>
          </button>
        </form>
      </div>

      {/* Discovery Algorithm Filters */}
      <div className="flex flex-wrap gap-2">
        {DISCOVERY_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-medium transition flex items-center gap-2 border ${
              activeFilter === f.id
                ? 'bg-zinc-900 border-zinc-700 text-white shadow-md'
                : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            {f.icon}
            <span>{f.label}</span>
          </button>
        ))}
      </div>

      {/* Refresh & Interval Control Ribbon */}
      <div className="p-3 bg-zinc-900/65 backdrop-blur-md border border-zinc-800/80 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchTrending()}
            disabled={isRefreshing}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            <span>Sync Now</span>
          </button>
          <span className="text-zinc-500 text-[11px] flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Last Synced: <span className="text-zinc-300 font-semibold">{lastSyncedTime}</span>
          </span>
        </div>

        {/* Auto-Refresh Engine Controls */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-[11px]">Auto-Refresh:</span>
            <button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${
                autoRefreshEnabled
                  ? 'bg-emerald-950/50 border-emerald-700 text-emerald-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500'
              }`}
            >
              {autoRefreshEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-zinc-500 text-[11px]">Interval:</span>
            <div className="flex gap-1 bg-zinc-950 p-0.5 rounded border border-zinc-800">
              {REFRESH_INTERVALS.map((intv) => (
                <button
                  key={intv.label}
                  onClick={() => setIntervalMs(intv.ms)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
                    intervalMs === intv.ms
                      ? 'bg-zinc-800 font-bold text-white'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {intv.label}
                </button>
              ))}
            </div>
          </div>

          {/* Visual Countdown Progress Bar */}
          <div className="w-24 bg-zinc-800 h-2 rounded-full overflow-hidden" title="Next auto-refresh cycle">
            <div
              className="bg-emerald-400 h-full transition-all duration-200"
              style={{ width: `${countdownPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Trending Stocks Master Table */}
      <div className="bg-zinc-900/65 backdrop-blur-md border border-zinc-800/80 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800/80 bg-zinc-950/60 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                <th className="py-3 px-4">Stock / Company</th>
                <th className="py-3 px-4">Price &amp; RVOL</th>
                <th className="py-3 px-4">Day Change (%)</th>
                <th className="py-3 px-4">AI Target &amp; Stop</th>
                <th className="py-3 px-4">Review Findings</th>
                <th className="py-3 px-4">Position-Gated Orders</th>
                <th className="py-3 px-4 text-right">Action Tools</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50 text-xs font-mono">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    Scanning live algorithmic market feed...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    No trending stocks found matching filter &quot;{activeFilter}&quot;.
                  </td>
                </tr>
              ) : (
                filtered.map((stock) => {
                  const isOwned = stock.isOwned && stock.ownedQuantity > 0;
                  return (
                    <tr key={stock.ticker} className="hover:bg-zinc-800/30 transition-colors">
                      {/* Col 1: Stock / Company */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center font-bold text-xs text-white">
                            {stock.ticker.substring(0, 3)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-white tracking-wide">{stock.ticker}</span>
                              {isOwned ? (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-800/50 font-bold">
                                  {stock.ownedQuantity} OWNED
                                </span>
                              ) : (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                                  UNOWNED
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-400 truncate max-w-[130px]">
                              {stock.companyName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Col 2: Price & RVOL */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="font-bold text-sm text-zinc-100 tabular-nums">
                            ${stock.livePrice?.toFixed(2)}
                          </div>
                          <div className="text-[11px] text-emerald-400 tabular-nums">
                            RVOL: {stock.relativeVolume ? `${stock.relativeVolume.toFixed(2)}x` : '--'}
                          </div>
                        </div>
                      </td>

                      {/* Col 3: Day Change */}
                      <td className="py-3.5 px-4">
                        <div className={`font-bold tabular-nums flex items-center gap-1 ${stock.dayChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {stock.dayChangePct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {stock.dayChangePct >= 0 ? '+' : ''}{stock.dayChangePct?.toFixed(2)}%
                        </div>
                        <div className="text-[10px] text-zinc-500">{stock.discoveryAlgorithm}</div>
                      </td>

                      {/* Col 4: AI Target & Stop */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="text-emerald-400">TP: ${stock.predictedTargetPrice?.toFixed(2)}</div>
                          <div className="text-rose-400">SL: ${stock.stopLossPrice?.toFixed(2)}</div>
                          <div className="text-[10px] text-zinc-500">R/R: {stock.riskRewardRatio?.toFixed(2)}</div>
                        </div>
                      </td>

                      {/* Col 5: Review Findings Links */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 text-[11px]">
                          <button
                            onClick={() => onNavigate(`/stocks/${stock.ticker}/review/technical`)}
                            className="flex items-center gap-1 text-zinc-300 hover:text-emerald-400 hover:underline transition"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>Technical Review</span>
                            <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                          </button>
                          <button
                            onClick={() => onNavigate(`/stocks/${stock.ticker}/review/critic`)}
                            className="flex items-center gap-1 text-zinc-300 hover:text-cyan-400 hover:underline transition"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                            <span>Critic Audit Gate</span>
                            <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                          </button>
                          <button
                            onClick={() => onNavigate(`/stocks/${stock.ticker}/review/sec-memory`)}
                            className="flex items-center gap-1 text-zinc-300 hover:text-purple-400 hover:underline transition"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                            <span>SEC &amp; Dilution</span>
                            <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                          </button>
                        </div>
                      </td>

                      {/* Col 6: Position-Gated Orders (CRITICAL MANDATE) */}
                      <td className="py-3.5 px-4">
                        {isOwned ? (
                          // If owned: render Buy AND Sell buttons
                          <div className="grid grid-cols-2 gap-1.5 min-w-[150px]">
                            <button
                              onClick={() =>
                                setTicketParams({
                                  ticker: stock.ticker,
                                  initialSide: 'BUY',
                                  initialType: 'LIMIT',
                                  price: stock.livePrice,
                                  targetPrice: stock.predictedTargetPrice,
                                  stopLossPrice: stock.stopLossPrice,
                                  ownedQuantity: stock.ownedQuantity,
                                })
                              }
                              className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/80 rounded text-[11px] text-emerald-300 font-semibold transition"
                            >
                              Limit Buy
                            </button>
                            <button
                              onClick={() =>
                                setTicketParams({
                                  ticker: stock.ticker,
                                  initialSide: 'BUY',
                                  initialType: 'MARKET',
                                  price: stock.livePrice,
                                  targetPrice: stock.predictedTargetPrice,
                                  stopLossPrice: stock.stopLossPrice,
                                  ownedQuantity: stock.ownedQuantity,
                                })
                              }
                              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[11px] text-zinc-200 transition"
                            >
                              Mkt Buy
                            </button>
                            <button
                              onClick={() =>
                                setTicketParams({
                                  ticker: stock.ticker,
                                  initialSide: 'SELL',
                                  initialType: 'LIMIT',
                                  price: stock.livePrice,
                                  targetPrice: stock.predictedTargetPrice,
                                  stopLossPrice: stock.stopLossPrice,
                                  ownedQuantity: stock.ownedQuantity,
                                })
                              }
                              className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 rounded text-[11px] text-rose-300 font-semibold transition"
                            >
                              Limit Sell
                            </button>
                            <button
                              onClick={() =>
                                setTicketParams({
                                  ticker: stock.ticker,
                                  initialSide: 'SELL',
                                  initialType: 'MARKET',
                                  price: stock.livePrice,
                                  targetPrice: stock.predictedTargetPrice,
                                  stopLossPrice: stock.stopLossPrice,
                                  ownedQuantity: stock.ownedQuantity,
                                })
                              }
                              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[11px] text-zinc-200 transition"
                            >
                              Mkt Sell
                            </button>
                          </div>
                        ) : (
                          // If unowned (ownedQuantity == 0): Render ONLY Limit Buy and Market Buy!
                          <div className="flex flex-col gap-1 min-w-[140px]">
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                onClick={() =>
                                  setTicketParams({
                                    ticker: stock.ticker,
                                    initialSide: 'BUY',
                                    initialType: 'LIMIT',
                                    price: stock.livePrice,
                                    targetPrice: stock.predictedTargetPrice,
                                    stopLossPrice: stock.stopLossPrice,
                                    ownedQuantity: 0,
                                  })
                                }
                                className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/80 rounded text-[11px] text-emerald-300 font-semibold transition"
                              >
                                Limit Buy
                              </button>
                              <button
                                onClick={() =>
                                  setTicketParams({
                                    ticker: stock.ticker,
                                    initialSide: 'BUY',
                                    initialType: 'MARKET',
                                    price: stock.livePrice,
                                    targetPrice: stock.predictedTargetPrice,
                                    stopLossPrice: stock.stopLossPrice,
                                    ownedQuantity: 0,
                                  })
                                }
                                className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[11px] text-zinc-200 transition"
                              >
                                Mkt Buy
                              </button>
                            </div>
                            <span className="text-[9px] text-zinc-500 font-mono text-center flex items-center justify-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> Sell Gated (0 shares owned)
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Col 7: Action Tools */}
                      <td className="py-3.5 px-4 text-right">
                        <StockRowActionIcons
                          ticker={stock.ticker}
                          isOwned={isOwned}
                          onOpenChart={() => setChartTicker(stock.ticker)}
                          onOpenStrategy={() => setStrategyTicker(stock.ticker)}
                          onOpenBracket={() =>
                            setBracketParams({
                              ticker: stock.ticker,
                              price: stock.livePrice,
                              sl: stock.stopLossPrice,
                              tp: stock.predictedTargetPrice,
                            })
                          }
                          onOpenCostBasis={() =>
                            setCostBasisParams({
                              ticker: stock.ticker,
                              qty: stock.ownedQuantity,
                              avgCost: stock.livePrice,
                              price: stock.livePrice,
                            })
                          }
                          onQuickScaleOut={
                            isOwned
                              ? () =>
                                  setTicketParams({
                                    ticker: stock.ticker,
                                    initialSide: 'SELL',
                                    initialType: 'MARKET',
                                    price: stock.livePrice,
                                    targetPrice: stock.predictedTargetPrice,
                                    stopLossPrice: stock.stopLossPrice,
                                    ownedQuantity: stock.ownedQuantity,
                                  })
                              : undefined
                          }
                          onReAnalyze={() => handleReAnalyze(stock.ticker)}
                          onOpenHistory={() => setHistoryTicker(stock.ticker)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals & Drawers */}
      {ticketParams && (
        <OrderTicketModal
          params={ticketParams}
          onClose={() => setTicketParams(null)}
          onSuccess={() => fetchTrending(true)}
        />
      )}

      {chartTicker && (
        <StockChartDrawer
          ticker={chartTicker}
          onClose={() => setChartTicker(null)}
          onOpenOrderTicket={(side) => {
            const stock = stocks.find((s) => s.ticker === chartTicker);
            setTicketParams({
              ticker: chartTicker,
              initialSide: side,
              price: stock?.livePrice || 100,
              targetPrice: stock?.predictedTargetPrice,
              stopLossPrice: stock?.stopLossPrice,
              ownedQuantity: stock?.ownedQuantity || 0,
            });
          }}
        />
      )}

      {strategyTicker && (
        <AdvancedStrategyModal ticker={strategyTicker} onClose={() => setStrategyTicker(null)} />
      )}

      {bracketParams && (
        <SmartBracketModal
          ticker={bracketParams.ticker}
          currentPrice={bracketParams.price}
          initialStopLoss={bracketParams.sl}
          initialTarget={bracketParams.tp}
          onClose={() => setBracketParams(null)}
          onSave={() => fetchTrending(true)}
        />
      )}

      {costBasisParams && (
        <CostBasisCalculatorModal
          ticker={costBasisParams.ticker}
          ownedQuantity={costBasisParams.qty}
          averageCostPrice={costBasisParams.avgCost}
          liveMarketPrice={costBasisParams.price}
          onClose={() => setCostBasisParams(null)}
        />
      )}

      {historyTicker && (
        <PositionHistoryModal ticker={historyTicker} onClose={() => setHistoryTicker(null)} />
      )}
    </div>
  );
};
