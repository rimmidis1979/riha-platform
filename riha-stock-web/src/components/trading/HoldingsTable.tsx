import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { Holding } from '../../types/trading';
import { StockApiClient } from '../../services/stockApiClient';
import {
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  Sparkles,
  Zap,
  Activity,
  Bot,
  Sliders,
  Landmark,
} from 'lucide-react';

interface HoldingsTableProps {
  onExploreTrending?: () => void;
  brokerFilter?: 'ALL' | 'ROBINHOOD' | 'CHARLES_SCHWAB';
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({
  onExploreTrending,
  brokerFilter = 'ALL',
}) => {
  const { holdings, openTradeModal } = useTrading();
  const [updatingSymbol, setUpdatingSymbol] = useState<string | null>(null);
  const [localOverrides, setLocalOverrides] = useState<
    Record<string, { runStrategicLoop?: boolean; executionMode?: 'PAPERLESS' | 'ACTUAL'; recommendation?: string }>
  >({});

  const filteredHoldings = holdings.filter((h) => {
    if (brokerFilter === 'ALL') return true;
    if (brokerFilter === 'ROBINHOOD') return !h.broker || h.broker === 'ROBINHOOD';
    if (brokerFilter === 'CHARLES_SCHWAB') return h.broker === 'CHARLES_SCHWAB';
    return true;
  });

  const handleToggleStrategicLoop = async (holding: Holding) => {
    const currentLoop = localOverrides[holding.symbol]?.runStrategicLoop ?? (holding.runStrategicLoop ?? true);
    const newLoop = !currentLoop;
    const currentMode = localOverrides[holding.symbol]?.executionMode ?? (holding.executionMode ?? 'PAPERLESS');

    setUpdatingSymbol(holding.symbol);
    try {
      const updated = await StockApiClient.updateStockStrategicLoop(holding.symbol, newLoop, currentMode);
      setLocalOverrides((prev) => ({
        ...prev,
        [holding.symbol]: {
          ...prev[holding.symbol],
          runStrategicLoop: newLoop,
          recommendation: updated?.latestRecommendation || prev[holding.symbol]?.recommendation || 'HOLD',
        },
      }));
    } catch (err) {
      console.error('Failed to toggle strategic loop:', err);
    } finally {
      setUpdatingSymbol(null);
    }
  };

  const handleToggleExecutionMode = async (holding: Holding, mode: 'PAPERLESS' | 'ACTUAL') => {
    const currentLoop = localOverrides[holding.symbol]?.runStrategicLoop ?? (holding.runStrategicLoop ?? true);
    setUpdatingSymbol(holding.symbol);
    try {
      await StockApiClient.updateStockStrategicLoop(holding.symbol, currentLoop, mode);
      setLocalOverrides((prev) => ({
        ...prev,
        [holding.symbol]: {
          ...prev[holding.symbol],
          executionMode: mode,
        },
      }));
    } catch (err) {
      console.error('Failed to toggle execution mode:', err);
    } finally {
      setUpdatingSymbol(null);
    }
  };

  if (filteredHoldings.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
        <Sparkles className="w-10 h-10 text-blue-600 mx-auto mb-3 opacity-80" />
        <h3 className="text-base font-bold text-slate-900">
          No {brokerFilter === 'ALL' ? '' : brokerFilter === 'ROBINHOOD' ? 'Robinhood ' : 'Charles Schwab '}
          Positions Found
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
          You currently don't own any assets in this account view. Execute a trade or synchronize your broker to view holdings.
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
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            Stocks You Own ({filteredHoldings.length} Active Positions)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Continuous AI Strategic Diagnosis, Paperless vs Actual Execution, and Real-Time Returns
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            Strategic Loops Active
          </span>
        </div>
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
              <th className="py-3.5 px-4 font-semibold text-right">Total Return</th>
              <th className="py-3.5 px-4 font-semibold text-center">Strategic Loop</th>
              <th className="py-3.5 px-4 font-semibold text-center">Mode</th>
              <th className="py-3.5 px-4 font-semibold text-center">Trade Options</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filteredHoldings.map((holding: Holding) => {
              const isTotalGainPositive = holding.totalGain >= 0;
              const isDayGainPositive = holding.dayGain >= 0;

              const loopActive = localOverrides[holding.symbol]?.runStrategicLoop ?? (holding.runStrategicLoop ?? true);
              const execMode = localOverrides[holding.symbol]?.executionMode ?? (holding.executionMode ?? 'PAPERLESS');
              const recommendation = localOverrides[holding.symbol]?.recommendation ?? (holding.latestRecommendation || 'HOLD');
              const isSchwab = holding.broker === 'CHARLES_SCHWAB';

              return (
                <tr key={holding.symbol} className="hover:bg-slate-50/80 transition-colors group">
                  {/* Symbol, Name & Broker Tag */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs border ${
                          isSchwab
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                      >
                        {holding.symbol.substring(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 font-mono leading-tight">
                            {holding.symbol}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              isSchwab
                                ? 'bg-sky-100 text-sky-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {isSchwab ? 'Schwab' : 'Robinhood'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 truncate max-w-[140px] block mt-0.5">
                          {holding.name || holding.companyName || holding.symbol}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="py-4 px-4 text-right font-mono font-bold text-slate-800">
                    {typeof holding.shares === 'number'
                      ? holding.shares < 0.001
                        ? holding.shares.toExponential(2)
                        : holding.shares.toLocaleString()
                      : holding.shares}
                  </td>

                  {/* Avg Cost */}
                  <td className="py-4 px-4 text-right font-mono text-slate-600">
                    ${holding.avgCost ? holding.avgCost.toFixed(2) : '0.00'}
                  </td>

                  {/* Current Price */}
                  <td className="py-4 px-4 text-right font-mono font-bold text-slate-900">
                    ${holding.currentPrice ? holding.currentPrice.toFixed(2) : '0.00'}
                  </td>

                  {/* Total Equity */}
                  <td className="py-4 px-4 text-right font-mono font-black text-slate-900">
                    ${(holding.equity || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Total All-Time Return */}
                  <td className="py-4 px-4 text-right font-mono">
                    <div
                      className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-md ${
                        isTotalGainPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                      }`}
                    >
                      {isTotalGainPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                      {isTotalGainPositive ? '+' : ''}${Math.abs(holding.totalGain || 0).toFixed(2)} ({isTotalGainPositive ? '+' : ''}
                      {(holding.totalGainPercent || 0).toFixed(2)}%)
                    </div>
                  </td>

                  {/* Run Strategic Loop Toggle & Live Recommendation Label */}
                  <td className="py-4 px-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => handleToggleStrategicLoop(holding)}
                        disabled={updatingSymbol === holding.symbol}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all border ${
                          loopActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                        title="Continuously scan market signals and update buy/sell/hold diagnostics"
                      >
                        <Zap
                          className={`w-3 h-3 ${loopActive ? 'text-emerald-600 fill-emerald-500 animate-pulse' : 'text-slate-400'}`}
                        />
                        <span>{loopActive ? 'Loop: ACTIVE' : 'Loop: OFF'}</span>
                      </button>

                      {/* AI Strategy Diagnosis Label */}
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          recommendation === 'BUY'
                            ? 'bg-emerald-100 text-emerald-800'
                            : recommendation === 'SELL'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        Signal: {recommendation}
                      </span>
                    </div>
                  </td>

                  {/* Stock-level Execution Mode: Paperless vs Actual */}
                  <td className="py-4 px-4 text-center">
                    <div className="inline-flex rounded-lg p-0.5 bg-slate-100 border border-slate-200">
                      <button
                        onClick={() => handleToggleExecutionMode(holding, 'PAPERLESS')}
                        disabled={updatingSymbol === holding.symbol}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                          execMode === 'PAPERLESS'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Paper
                      </button>
                      <button
                        onClick={() => handleToggleExecutionMode(holding, 'ACTUAL')}
                        disabled={updatingSymbol === holding.symbol}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                          execMode === 'ACTUAL'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Actual
                      </button>
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

