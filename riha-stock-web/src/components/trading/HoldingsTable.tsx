import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { Holding } from '../../types/trading';
import { ArrowUpRight, ArrowDownRight, Plus, Minus, TrendingUp, Sparkles } from 'lucide-react';

export const HoldingsTable: React.FC = () => {
  const { holdings, openTradeModal } = useTrading();

  if (holdings.length === 0) {
    return (
      <div className="onyx-card rounded-2xl p-12 text-center border border-zinc-800">
        <Sparkles className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-60" />
        <h3 className="text-base font-bold text-white">No Open Positions Yet</h3>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
          Explore Trending Stocks or use the Trade Search to build your personalized AI-driven stock portfolio.
        </p>
      </div>
    );
  }

  return (
    <div className="onyx-card rounded-2xl border border-zinc-800 overflow-hidden">
      <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Stocks You Own ({holdings.length} Active Positions)
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">Real-time equity valuation, cost-basis, and performance returns</p>
        </div>

        <span className="text-xs font-mono text-zinc-500 hidden sm:inline">
          Live Sync • 4s Refresh Rate
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-950/60 text-[11px] font-mono uppercase text-zinc-400">
              <th className="py-3.5 px-4 font-semibold">Asset / Symbol</th>
              <th className="py-3.5 px-4 font-semibold text-right">Shares</th>
              <th className="py-3.5 px-4 font-semibold text-right">Avg Cost</th>
              <th className="py-3.5 px-4 font-semibold text-right">Market Price</th>
              <th className="py-3.5 px-4 font-semibold text-right">Total Equity</th>
              <th className="py-3.5 px-4 font-semibold text-right">Today's Return</th>
              <th className="py-3.5 px-4 font-semibold text-right">Total Return</th>
              <th className="py-3.5 px-4 font-semibold text-center">Trade Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50 text-sm">
            {holdings.map((holding: Holding) => {
              const isTotalGainPositive = holding.totalGain >= 0;
              const isDayGainPositive = holding.dayGain >= 0;

              return (
                <tr key={holding.symbol} className="trading-table-row transition-colors group">
                  {/* Symbol & Name */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-zinc-800/90 flex items-center justify-center font-bold font-mono text-white text-xs border border-zinc-700/60 group-hover:border-emerald-500/50 transition-colors">
                        {holding.symbol}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-1.5">
                          {holding.symbol}
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-normal">
                            {holding.sector}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 truncate max-w-[170px]">{holding.name}</div>
                      </div>
                    </div>
                  </td>

                  {/* Shares Owned */}
                  <td className="py-4 px-4 text-right font-mono font-medium text-zinc-200">
                    {holding.shares.toLocaleString()}
                  </td>

                  {/* Average Buy Cost */}
                  <td className="py-4 px-4 text-right font-mono text-zinc-400">
                    ${holding.avgCost.toFixed(2)}
                  </td>

                  {/* Current Market Price */}
                  <td className="py-4 px-4 text-right font-mono font-bold text-white">
                    ${holding.currentPrice.toFixed(2)}
                  </td>

                  {/* Total Position Equity */}
                  <td className="py-4 px-4 text-right font-mono font-bold text-zinc-100">
                    ${holding.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Day Return */}
                  <td className="py-4 px-4 text-right font-mono">
                    <div className={`flex items-center justify-end gap-1 ${isDayGainPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isDayGainPositive ? <ArrowDownRight className="w-3.5 h-3.5 rotate-180" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      <span>
                        {isDayGainPositive ? '+' : ''}${Math.abs(holding.dayGain).toFixed(2)} ({isDayGainPositive ? '+' : ''}
                        {holding.dayGainPercent.toFixed(2)}%)
                      </span>
                    </div>
                  </td>

                  {/* Total Return */}
                  <td className="py-4 px-4 text-right font-mono font-semibold">
                    <div className={`flex items-center justify-end gap-1 ${isTotalGainPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isTotalGainPositive ? <ArrowDownRight className="w-3.5 h-3.5 rotate-180" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      <span>
                        {isTotalGainPositive ? '+' : ''}${Math.abs(holding.totalGain).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({isTotalGainPositive ? '+' : ''}
                        {holding.totalGainPercent.toFixed(2)}%)
                      </span>
                    </div>
                  </td>

                  {/* Buy / Sell Options */}
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() =>
                          openTradeModal({
                            symbol: holding.symbol,
                            companyName: holding.name,
                            currentPrice: holding.currentPrice,
                            defaultSide: 'BUY',
                          })
                        }
                        title={`Buy more ${holding.symbol}`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold transition-all hover:scale-105"
                      >
                        <Plus className="w-3 h-3" />
                        Buy
                      </button>

                      <button
                        onClick={() =>
                          openTradeModal({
                            symbol: holding.symbol,
                            companyName: holding.name,
                            currentPrice: holding.currentPrice,
                            defaultSide: 'SELL',
                          })
                        }
                        title={`Sell ${holding.symbol}`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono font-bold transition-all hover:scale-105"
                      >
                        <Minus className="w-3 h-3" />
                        Sell
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
