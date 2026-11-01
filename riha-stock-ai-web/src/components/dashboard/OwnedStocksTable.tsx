import React, { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Lock,
  Search,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { OwnedStockPosition } from '../../types/stockAi';
import { StockRowActionIcons } from './StockRowActionIcons';

interface Props {
  positions: OwnedStockPosition[];
  loading: boolean;
  onOpenOrderTicket: (
    ticker: string,
    side: 'BUY' | 'SELL',
    type: 'LIMIT' | 'MARKET',
    price: number,
    targetPrice: number,
    stopLossPrice: number,
    ownedQty: number
  ) => void;
  onOpenChart: (ticker: string) => void;
  onOpenStrategy: (ticker: string) => void;
  onOpenBracket: (ticker: string, price: number, sl: number, tp: number) => void;
  onOpenCostBasis: (ticker: string, qty: number, avgCost: number, price: number) => void;
  onReAnalyze: (ticker: string) => void;
  onOpenHistory: (ticker: string) => void;
  onNavigateToReview: (route: string) => void;
}

export const OwnedStocksTable: React.FC<Props> = ({
  positions,
  loading,
  onOpenOrderTicket,
  onOpenChart,
  onOpenStrategy,
  onOpenBracket,
  onOpenCostBasis,
  onReAnalyze,
  onOpenHistory,
  onNavigateToReview,
}) => {
  const [search, setSearch] = useState('');

  const filtered = positions.filter((p) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return p.ticker.toLowerCase().includes(term) || p.companyName?.toLowerCase().includes(term);
  });

  return (
    <div className="bg-zinc-900/65 backdrop-blur-md border border-zinc-800/80 rounded-xl overflow-hidden shadow-xl">
      {/* Table Toolbar Header */}
      <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/40 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h2 className="text-sm font-bold font-mono text-zinc-100 uppercase tracking-wider">
              Stocks I Own (Active Equity Workstation)
            </h2>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-emerald-300">
            {positions.length} Active {positions.length === 1 ? 'Holding' : 'Holdings'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search owned tickers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-950/60 text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
              <th className="py-3 px-4">Col 1: Stock &amp; Position</th>
              <th className="py-3 px-4">Col 2: Cost Basis vs Live</th>
              <th className="py-3 px-4">Col 3: Unrealized &amp; Today P&amp;L</th>
              <th className="py-3 px-4">Col 4: AI Strategy &amp; Prediction</th>
              <th className="py-3 px-4">Col 5: Deep Findings Reviews</th>
              <th className="py-3 px-4">Col 6: Direct Order Execution</th>
              <th className="py-3 px-4 text-right">Col 7: Action Tools</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50 text-xs font-mono">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                  Loading live portfolio holdings...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-500 font-mono">
                  No owned stock positions active. (Zero Mock Data Policy enforced — Account balance strictly $0.00 until Robinhood MCP connected or trade executed).
                </td>
              </tr>
            ) : (
              filtered.map((pos) => {
                const isProfit = pos.unrealizedPnlUsd >= 0;
                return (
                  <tr
                    key={pos.ticker}
                    className="hover:bg-zinc-800/30 transition-colors group"
                  >
                    {/* Col 1: Stock & Position Header */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center font-bold text-xs text-white">
                          {pos.ticker.substring(0, 3)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-white tracking-wide">
                              {pos.ticker}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950/50 text-emerald-400 border border-emerald-800/50 font-bold">
                              {pos.ownedQuantity} SHS
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-400 truncate max-w-[140px]">
                            {pos.companyName}
                          </div>
                          <div className="text-[11px] text-zinc-500 tabular-nums">
                            Val: ${pos.totalPositionValueUsd.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Col 2: Cost Basis vs Live Market Price */}
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-zinc-100 font-bold text-sm tabular-nums">
                            ${pos.liveMarketPrice.toFixed(2)}
                          </span>
                          <span className={`text-[11px] font-semibold tabular-nums flex items-center ${pos.priceDeltaUsd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pos.priceDeltaUsd >= 0 ? '+' : ''}${pos.priceDeltaUsd.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 tabular-nums mt-0.5">
                          Avg Cost: ${pos.averageCostPrice.toFixed(2)}
                        </div>
                        <div className={`text-[10px] tabular-nums ${pos.priceChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pos.priceChangePct >= 0 ? '+' : ''}{pos.priceChangePct.toFixed(2)}% entry delta
                        </div>
                      </div>
                    </td>

                    {/* Col 3: Unrealized & Today P&L */}
                    <td className="py-3.5 px-4">
                      <div>
                        <div className={`font-bold text-sm tabular-nums flex items-center gap-1 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {isProfit ? '+' : ''}${pos.unrealizedPnlUsd.toFixed(2)}
                        </div>
                        <div className={`text-[11px] tabular-nums ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? '+' : ''}{pos.unrealizedPnlPct.toFixed(2)}% return
                        </div>
                        <div className="text-[10px] text-zinc-500 tabular-nums mt-0.5">
                          Today: {pos.todayPnlUsd >= 0 ? '+' : ''}${pos.todayPnlUsd.toFixed(2)} ({pos.todayPnlPct.toFixed(2)}%)
                        </div>
                      </div>
                    </td>

                    {/* Col 4: AI Strategy & Target Predictions */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="font-semibold text-zinc-200 text-xs">
                          {pos.strategyApplied}
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-emerald-400">TP: ${pos.predictedTargetPrice.toFixed(2)}</span>
                          <span className="text-rose-400">SL: ${pos.stopLossPrice.toFixed(2)}</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                          <span>R/R: {pos.riskRewardRatio.toFixed(2)}</span>
                          <span>Conv: {(pos.confidenceScore * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    </td>

                    {/* Col 5: Clickable Review Links to Dedicated Pages */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => onNavigateToReview(`/stocks/${pos.ticker}/review/technical`)}
                          className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-emerald-400 hover:underline transition"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>Technical Review</span>
                          <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                        </button>
                        <button
                          onClick={() => onNavigateToReview(`/stocks/${pos.ticker}/review/critic`)}
                          className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-cyan-400 hover:underline transition"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                          <span>Critic Gate Audit</span>
                          <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                        </button>
                        <button
                          onClick={() => onNavigateToReview(`/stocks/${pos.ticker}/review/sec-memory`)}
                          className="flex items-center gap-1 text-[11px] text-zinc-300 hover:text-purple-400 hover:underline transition"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                          <span>SEC &amp; Memory RAG</span>
                          <ExternalLink className="w-2.5 h-2.5 text-zinc-500" />
                        </button>
                      </div>
                    </td>

                    {/* Col 6: Direct Action Order Buttons (Owned = BUY & SELL Rendered) */}
                    <td className="py-3.5 px-4">
                      <div className="grid grid-cols-2 gap-1.5 min-w-[160px]">
                        <button
                          onClick={() =>
                            onOpenOrderTicket(
                              pos.ticker,
                              'BUY',
                              'LIMIT',
                              pos.liveMarketPrice,
                              pos.predictedTargetPrice,
                              pos.stopLossPrice,
                              pos.ownedQuantity
                            )
                          }
                          className="px-2 py-1 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/80 rounded text-[11px] text-emerald-300 font-semibold transition"
                        >
                          Limit Buy
                        </button>
                        <button
                          onClick={() =>
                            onOpenOrderTicket(
                              pos.ticker,
                              'BUY',
                              'MARKET',
                              pos.liveMarketPrice,
                              pos.predictedTargetPrice,
                              pos.stopLossPrice,
                              pos.ownedQuantity
                            )
                          }
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[11px] text-zinc-200 transition"
                        >
                          Mkt Buy
                        </button>
                        <button
                          onClick={() =>
                            onOpenOrderTicket(
                              pos.ticker,
                              'SELL',
                              'LIMIT',
                              pos.liveMarketPrice,
                              pos.predictedTargetPrice,
                              pos.stopLossPrice,
                              pos.ownedQuantity
                            )
                          }
                          className="px-2 py-1 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 rounded text-[11px] text-rose-300 font-semibold transition"
                        >
                          Limit Sell
                        </button>
                        <button
                          onClick={() =>
                            onOpenOrderTicket(
                              pos.ticker,
                              'SELL',
                              'MARKET',
                              pos.liveMarketPrice,
                              pos.predictedTargetPrice,
                              pos.stopLossPrice,
                              pos.ownedQuantity
                            )
                          }
                          className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[11px] text-zinc-200 transition"
                        >
                          Mkt Sell
                        </button>
                      </div>
                    </td>

                    {/* Col 7: Action Tools Toolbar */}
                    <td className="py-3.5 px-4 text-right">
                      <StockRowActionIcons
                        ticker={pos.ticker}
                        isOwned={true}
                        onOpenChart={() => onOpenChart(pos.ticker)}
                        onOpenStrategy={() => onOpenStrategy(pos.ticker)}
                        onOpenBracket={() =>
                          onOpenBracket(
                            pos.ticker,
                            pos.liveMarketPrice,
                            pos.stopLossPrice,
                            pos.predictedTargetPrice
                          )
                        }
                        onOpenCostBasis={() =>
                          onOpenCostBasis(
                            pos.ticker,
                            pos.ownedQuantity,
                            pos.averageCostPrice,
                            pos.liveMarketPrice
                          )
                        }
                        onQuickScaleOut={() =>
                          onOpenOrderTicket(
                            pos.ticker,
                            'SELL',
                            'MARKET',
                            pos.liveMarketPrice,
                            pos.predictedTargetPrice,
                            pos.stopLossPrice,
                            pos.ownedQuantity
                          )
                        }
                        onReAnalyze={() => onReAnalyze(pos.ticker)}
                        onOpenHistory={() => onOpenHistory(pos.ticker)}
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
  );
};

