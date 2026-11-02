import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { Holding } from '../../types/trading';
import { ArrowUpRight, ArrowDownRight, Plus, Minus, Sparkles } from 'lucide-react';

interface HoldingsTableProps {
  onExploreTrending?: () => void;
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({ onExploreTrending }) => {
  const { holdings, openTradeModal } = useTrading();

  if (holdings.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
        <Sparkles className="w-10 h-10 text-blue-600 mx-auto mb-3 opacity-80" />
        <h3 className="text-base font-bold text-slate-900">No Open Positions Yet</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
          You currently don't own any stocks. Scan Trending Stocks or execute your first trade to build your personalized portfolio.
        </p>
        {onExploreTrending && (
          <button
            onClick={onExploreTrending}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-all"
          >
            Explore Trending Stocks
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            Stocks You Own ({holdings.length} Active Positions)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Real-time equity valuation, cost-basis, and performance returns</p>
        </div>

        <span className="text-xs font-mono text-slate-400 hidden sm:inline">
          Live Portfolio Ledger
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase text-slate-500">
              <th className="py-3.5 px-4 font-semibold">Asset / Symbol</th>
              <th className="py-3.5 px-4 font-semibold text-right">Shares</th>
              <th className="py-3.5 px-4 font-semibold text-right">Avg Cost</th>
              <th className="py-3.5 px-4 font-semibold text-right">Market Price</th>
              <th className="py-3.5 px-4 font-semibold text-right">Total Equity</th>
              <th className="py-3.5 px-4 font-semibold text-right">Today's Return</th>
              <th className="py-3.5 px-4 font-semibold text-right">Total Return</th>
              <th className="py-3.5 px-4 font-semibold text-center">Trade Options</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {holdings.map((holding: Holding) => {
              const isTotalGainPositive = holding.totalGain >= 0;
              const isDayGainPositive = holding.dayGain >= 0;

              return (
                <tr key={holding.symbol} className="hover:bg-slate-50/80 transition-colors group">
                  {/* Symbol & Name */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center font-mono font-bold text-slate-800 text-xs border border-slate-200">
                        {holding.symbol}
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 font-mono block leading-tight">
                          {holding.symbol}
                        </span>
                        <span className="text-xs text-slate-500 truncate max-w-[150px] block mt-0.5">
                          {holding.name}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="py-4 px-4 text-right font-mono font-bold text-slate-800">
                    {holding.shares.toLocaleString()}
                  </td>

                  {/* Avg Cost */}
                  <td className="py-4 px-4 text-right font-mono text-slate-600">
                    ${holding.avgCost.toFixed(2)}
                  </td>

                  {/* Current Price */}
                  <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                    ${holding.currentPrice.toFixed(2)}
                  </td>

                  {/* Total Equity */}
                  <td className="py-4 px-4 text-right font-mono font-black text-slate-900">
                    ${holding.equity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Today's Return */}
                  <td className="py-4 px-4 text-right font-mono">
                    <div
                      className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-md ${
                        isDayGainPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                      }`}
                    >
                      {isDayGainPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                      {isDayGainPositive ? '+' : ''}${Math.abs(holding.dayGain).toFixed(2)} ({isDayGainPositive ? '+' : ''}
                      {holding.dayGainPercent.toFixed(2)}%)
                    </div>
                  </td>

                  {/* Total All-Time Return */}
                  <td className="py-4 px-4 text-right font-mono">
                    <div
                      className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-md ${
                        isTotalGainPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                      }`}
                    >
                      {isTotalGainPositive ? '+' : ''}${Math.abs(holding.totalGain).toFixed(2)} ({isTotalGainPositive ? '+' : ''}
                      {holding.totalGainPercent.toFixed(2)}%)
                    </div>
                  </td>

                  {/* Buy / Sell Quick Buttons */}
                  <td className="py-4 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() =>
                          openTradeModal({
                            symbol: holding.symbol,
                            companyName: holding.name,
                            currentPrice: holding.currentPrice,
                            defaultSide: 'BUY',
                          })
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Buy</span>
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
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1"
                      >
                        <Minus className="w-3 h-3" />
                        <span>Sell</span>
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
