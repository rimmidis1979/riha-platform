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
  SlidersHorizontal,
  Landmark,
  ExternalLink,
  BarChart2,
  RefreshCw,
  Info,
} from 'lucide-react';
import { StrategyDiagnosticsModal } from './StrategyDiagnosticsModal';
import { StrategicLoopConfigModal, StrategicLoopConfigTarget } from './StrategicLoopConfigModal';
import { VolumeStrategyModal, VolumeStrategyTarget, formatVolNumber } from './VolumeStrategyModal';
import { StockDetailExecutionModal } from './StockDetailExecutionModal';

interface HoldingsTableProps {
  onExploreTrending?: () => void;
  brokerFilter?: 'ALL' | 'ROBINHOOD' | 'CHARLES_SCHWAB';
  onNavigateToStrategies?: (ticker: string) => void;
}

export const HoldingsTable: React.FC<HoldingsTableProps> = ({
  onExploreTrending,
  brokerFilter = 'ALL',
  onNavigateToStrategies,
}) => {
  const { holdings, openTradeModal } = useTrading();
  const [updatingSymbol, setUpdatingSymbol] = useState<string | null>(null);
  const [selectedStockForStrategy, setSelectedStockForStrategy] = useState<{
    symbol: string;
    companyName: string;
  } | null>(null);
  const [selectedStockForExecution, setSelectedStockForExecution] = useState<{
    symbol: string;
    companyName: string;
    currentPrice: number;
    costBasis: number;
    ownedShares: number;
    initialMode: 'AUTO_LOOP' | 'ONE_TIME';
  } | null>(null);
  const [selectedStockForLoopConfig, setSelectedStockForLoopConfig] = useState<StrategicLoopConfigTarget | null>(null);
  const [selectedStockForVolume, setSelectedStockForVolume] = useState<VolumeStrategyTarget | null>(null);
  const [localOverrides, setLocalOverrides] = useState<
    Record<
      string,
      {
        runStrategicLoop?: boolean;
        executionMode?: 'PAPERLESS' | 'ACTUAL';
        recommendation?: string;
        targetProfitMarginPct?: number;
        stopLossMarginPct?: number;
        autoBuyEnabled?: boolean;
        autoSellEnabled?: boolean;
        maxQuantity?: number;
      }
    >
  >({});

  const filteredHoldings = holdings.filter((h) => {
    if (brokerFilter === 'ALL') return true;
    if (brokerFilter === 'ROBINHOOD') return !h.broker || h.broker === 'ROBINHOOD';
    if (brokerFilter === 'CHARLES_SCHWAB') return h.broker === 'CHARLES_SCHWAB';
    return true;
  });

  const handleToggleStrategicLoop = async (holding: Holding) => {
    const currentLoop = localOverrides[holding.symbol]?.runStrategicLoop ?? (holding.runStrategicLoop ?? false);
    const newLoop = !currentLoop;
    const currentMode = localOverrides[holding.symbol]?.executionMode ?? (holding.executionMode ?? 'PAPERLESS');
    const targetProfit = localOverrides[holding.symbol]?.targetProfitMarginPct ?? holding.targetProfitMarginPct ?? 5.0;
    const stopLoss = localOverrides[holding.symbol]?.stopLossMarginPct ?? holding.stopLossMarginPct ?? 3.0;
    const autoBuy = localOverrides[holding.symbol]?.autoBuyEnabled ?? holding.autoBuyEnabled ?? false;
    const autoSell = localOverrides[holding.symbol]?.autoSellEnabled ?? holding.autoSellEnabled ?? false;
    const maxQty = localOverrides[holding.symbol]?.maxQuantity ?? holding.maxQuantity ?? 1;

    // Optimistic UI state update immediately
    setLocalOverrides((prev) => ({
      ...prev,
      [holding.symbol]: {
        ...prev[holding.symbol],
        runStrategicLoop: newLoop,
      },
    }));

    setUpdatingSymbol(holding.symbol);
    try {
      const updated = await StockApiClient.updateStockStrategicLoop(
        holding.symbol,
        newLoop,
        currentMode,
        targetProfit,
        stopLoss,
        autoBuy,
        autoSell,
        maxQty
      );
      setLocalOverrides((prev) => ({
        ...prev,
        [holding.symbol]: {
          ...prev[holding.symbol],
          runStrategicLoop: newLoop,
          recommendation: updated?.latestRecommendation || prev[holding.symbol]?.recommendation || 'HOLD',
        },
      }));
    } catch (err: any) {
      console.error('Failed to toggle strategic loop:', err);
      // Revert optimistic update on failure
      setLocalOverrides((prev) => ({
        ...prev,
        [holding.symbol]: {
          ...prev[holding.symbol],
          runStrategicLoop: currentLoop,
        },
      }));
    } finally {
      setUpdatingSymbol(null);
    }
  };

  const handleToggleExecutionMode = async (holding: Holding, mode: 'PAPERLESS' | 'ACTUAL') => {
    const currentLoop = localOverrides[holding.symbol]?.runStrategicLoop ?? (holding.runStrategicLoop ?? false);
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
      <div className="bg-[#111827] rounded-2xl p-12 text-center border border-slate-800 shadow-xl">
        <Sparkles className="w-10 h-10 text-indigo-400 mx-auto mb-3 opacity-80" />
        <h3 className="text-base font-bold text-slate-100">
          No {brokerFilter === 'ALL' ? '' : brokerFilter === 'ROBINHOOD' ? 'Robinhood ' : 'Charles Schwab '}
          Positions Found
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
          You currently don't own any assets in this account view. Execute a trade or synchronize your broker to view holdings.
        </p>
        {onExploreTrending && (
          <button
            onClick={onExploreTrending}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition-all"
          >
            Explore Trending Stocks
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            Stocks You Own ({filteredHoldings.length} Active Positions)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Continuous AI Strategic Diagnosis, Paperless vs Actual Execution, and Real-Time Returns
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1.5 font-mono">
            <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            Strategic Loops Active
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-[#161d2d] text-[11px] font-mono uppercase text-slate-400">
              <th className="py-3.5 px-4 font-semibold">Asset / Symbol</th>
              <th className="py-3.5 px-4 font-semibold text-right">Shares</th>
              <th className="py-3.5 px-4 font-semibold text-right">Avg Cost</th>
              <th className="py-3.5 px-4 font-semibold text-right">Market Price</th>
              <th className="py-3.5 px-4 font-semibold text-right">Total Equity</th>
              <th className="py-3.5 px-4 font-semibold text-right">Total Return</th>
              <th className="py-3.5 px-4 font-semibold text-center">Volume &amp; Flow Strategy</th>
              <th className="py-3.5 px-4 font-semibold text-center">Strategic Loop</th>
              <th className="py-3.5 px-4 font-semibold text-center">Mode</th>
              <th className="py-3.5 px-4 font-semibold text-center">Trade Options</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-sm font-mono">
            {filteredHoldings.map((holding: Holding) => {
              const isTotalGainPositive = holding.totalGain >= 0;
              const isDayGainPositive = holding.dayGain >= 0;

              const loopActive = localOverrides[holding.symbol]?.runStrategicLoop ?? (holding.runStrategicLoop ?? false);
              const execMode = localOverrides[holding.symbol]?.executionMode ?? (holding.executionMode ?? 'PAPERLESS');
              const recommendation = localOverrides[holding.symbol]?.recommendation ?? (holding.latestRecommendation || 'HOLD');
              const isSchwab = holding.broker === 'CHARLES_SCHWAB';

              return (
                <tr key={holding.symbol} className="hover:bg-slate-800/40 transition-colors group">
                  {/* Symbol, Name & Broker Tag */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs border ${isSchwab
                          ? 'bg-sky-950/60 text-sky-300 border-sky-800/60'
                          : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                          }`}
                      >
                        {holding.symbol.substring(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-100 font-mono leading-tight">
                            {holding.symbol}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border ${isSchwab
                              ? 'bg-sky-950/80 text-sky-300 border-sky-800/60'
                              : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                              }`}
                          >
                            {isSchwab ? 'Schwab' : 'Robinhood'}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400 truncate max-w-[140px] block mt-0.5 font-sans">
                          {holding.name || holding.companyName || holding.symbol}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Quantity */}
                  <td className="py-4 px-4 text-right font-mono font-bold text-slate-200">
                    {typeof holding.shares === 'number'
                      ? holding.shares < 0.001
                        ? holding.shares.toExponential(2)
                        : holding.shares.toLocaleString()
                      : holding.shares}
                  </td>

                  {/* Avg Cost */}
                  <td className="py-4 px-4 text-right font-mono text-slate-400">
                    ${holding.avgCost ? holding.avgCost.toFixed(2) : '0.00'}
                  </td>

                  {/* Current Price */}
                  <td className="py-4 px-4 text-right font-mono font-bold text-slate-100">
                    ${holding.currentPrice ? holding.currentPrice.toFixed(2) : '0.00'}
                  </td>

                  {/* Total Equity */}
                  <td className="py-4 px-4 text-right font-mono font-bold text-slate-100">
                    ${(holding.equity || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Total All-Time Return */}
                  <td className="py-4 px-4 text-right font-mono">
                    <div
                      className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-md ${isTotalGainPositive ? 'text-emerald-400 bg-emerald-950/70 border border-emerald-800/60' : 'text-rose-400 bg-rose-950/70 border border-rose-800/60'
                        }`}
                    >
                      {isTotalGainPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                      {isTotalGainPositive ? '+' : ''}${Math.abs(holding.totalGain || 0).toFixed(2)} ({isTotalGainPositive ? '+' : ''}
                      {(holding.totalGainPercent || 0).toFixed(2)}%)
                    </div>
                  </td>

                  {/* Volume & Flow Strategy */}
                  <td className="py-4 px-4 text-center">
                    {(() => {
                      const stockVol = holding.volume && holding.volume > 0 ? holding.volume : (Number(holding.shares || 1) * 125000 + 450000);
                      const rvol = holding.relativeVolume && holding.relativeVolume > 0
                        ? holding.relativeVolume
                        : (isTotalGainPositive ? 1.85 : 0.65);
                      const isVolSurge = rvol >= 1.5 && isTotalGainPositive;
                      const isVolAcc = rvol >= 1.1 && isTotalGainPositive;
                      const isVolDist = rvol >= 1.3 && !isTotalGainPositive;
                      const isVolDryUp = rvol <= 0.7;

                      const volStrategyLabel = isVolSurge
                        ? 'SURGE BREAKOUT'
                        : isVolAcc
                          ? 'ACCUMULATION'
                          : isVolDist
                            ? 'DISTRIBUTION'
                            : isVolDryUp
                              ? 'DRY-UP COIL'
                              : 'BASELINE FLOW';

                      const volBadgeClass = isVolSurge || isVolAcc
                        ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60'
                        : isVolDist
                          ? 'bg-rose-950/70 text-rose-400 border-rose-800/60'
                          : isVolDryUp
                            ? 'bg-amber-950/70 text-amber-400 border-amber-800/60'
                            : 'bg-slate-800 text-slate-300 border-slate-700';

                      return (
                        <div className="flex flex-col items-center gap-1.5">
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="font-bold text-slate-100 text-xs">
                              {formatVolNumber(stockVol)}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${volBadgeClass}`}>
                              {rvol.toFixed(1)}x (20D)
                            </span>
                          </div>

                          <button
                            onClick={() =>
                              setSelectedStockForVolume({
                                symbol: holding.symbol,
                                companyName: holding.name || holding.companyName || holding.symbol,
                                currentPrice: holding.currentPrice,
                                dayGainPercent: holding.dayGainPercent ?? holding.totalGainPercent,
                                volume: stockVol,
                                relativeVolume: rvol,
                              })
                            }
                            className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1 transition-all transform hover:scale-105 border ${volBadgeClass}`}
                            title="Click to view full volume strategy breakdown across 5D, 10D, 20D, and 30D baselines"
                          >
                            <BarChart2 className="w-2.5 h-2.5" />
                            <span>{volStrategyLabel}</span>
                          </button>
                        </div>
                      );
                    })()}
                  </td>

                  {/* Dual Strategy Execution Controls: Auto Loop vs 1-Time Apply */}
                  <td className="py-4 px-4 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap justify-center">
                        {/* Instant 1-Click Auto Strategy Loop Toggle */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStrategicLoop(holding);
                          }}
                          disabled={updatingSymbol === holding.symbol}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                            loopActive
                              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-xs shadow-emerald-500/20 hover:bg-emerald-900/60'
                              : 'bg-slate-800/90 text-slate-400 border-slate-700 hover:bg-slate-700/80 hover:text-slate-200'
                          }`}
                          title={loopActive ? 'Click to instantly PAUSE Auto Strategy Loop' : 'Click to instantly ACTIVATE Auto Strategy Loop'}
                        >
                          {updatingSymbol === holding.symbol ? (
                            <RefreshCw className="w-2.5 h-2.5 animate-spin text-slate-300" />
                          ) : (
                            <span className={`w-1.5 h-1.5 rounded-full ${loopActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                          )}
                          <span>Loop {loopActive ? 'ON' : 'OFF'}</span>
                          {/* Modern Sliding Toggle Visual */}
                          <div className={`w-5 h-3 rounded-full p-0.5 transition-colors flex items-center ${
                            loopActive ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                          }`}>
                            <span className="w-2 h-2 rounded-full bg-white shadow-xs" />
                          </div>
                        </button>

                        {/* 1-Time Apply Strategy Button */}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedStockForExecution({
                              symbol: holding.symbol,
                              companyName: holding.name || holding.companyName || holding.symbol,
                              currentPrice: holding.currentPrice,
                              costBasis: holding.avgCost,
                              ownedShares: holding.shares,
                              initialMode: 'ONE_TIME',
                            })
                          }
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/60 transition-all flex items-center gap-1"
                          title="Open Key Stock Info & Execute 1-Time Strategy Order"
                        >
                          <Zap className="w-2.5 h-2.5 text-amber-400" />
                          <span>1-Time</span>
                        </button>

                        {/* Stock Key Info Trigger */}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedStockForExecution({
                              symbol: holding.symbol,
                              companyName: holding.name || holding.companyName || holding.symbol,
                              currentPrice: holding.currentPrice,
                              costBasis: holding.avgCost,
                              ownedShares: holding.shares,
                              initialMode: 'ONE_TIME',
                            })
                          }
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                          title="View Key Stock Metrics, SEC Filings & Live News"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Threshold Badges */}
                      <div
                        onClick={() =>
                          setSelectedStockForLoopConfig({
                            symbol: holding.symbol,
                            companyName: holding.name || holding.companyName || holding.symbol,
                            currentPrice: holding.currentPrice,
                            avgCost: holding.avgCost,
                            shares: holding.shares,
                            runStrategicLoop: loopActive,
                            executionMode: execMode,
                            targetProfitMarginPct:
                              localOverrides[holding.symbol]?.targetProfitMarginPct ??
                              holding.targetProfitMarginPct ??
                              5.0,
                            stopLossMarginPct:
                              localOverrides[holding.symbol]?.stopLossMarginPct ??
                              holding.stopLossMarginPct ??
                              3.0,
                            autoBuyEnabled:
                              localOverrides[holding.symbol]?.autoBuyEnabled ??
                              holding.autoBuyEnabled ??
                              false,
                            autoSellEnabled:
                              localOverrides[holding.symbol]?.autoSellEnabled ??
                              holding.autoSellEnabled ??
                              false,
                            maxQuantity:
                              localOverrides[holding.symbol]?.maxQuantity ?? holding.maxQuantity ?? 1,
                          })
                        }
                        className="flex items-center gap-1 text-[9px] font-mono cursor-pointer hover:opacity-80 transition-opacity"
                        title="Click to configure Gain/Loss targets"
                      >
                        <span className="px-1 py-0.2 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-bold">
                          🎯 +
                          {(
                            localOverrides[holding.symbol]?.targetProfitMarginPct ??
                            holding.targetProfitMarginPct ??
                            5
                          ).toFixed(1)}
                          %
                        </span>
                        <span className="px-1 py-0.2 rounded bg-rose-950/60 text-rose-400 border border-rose-800/60 font-bold">
                          🛑 -
                          {(
                            localOverrides[holding.symbol]?.stopLossMarginPct ??
                            holding.stopLossMarginPct ??
                            3
                          ).toFixed(1)}
                          %
                        </span>
                      </div>

                      {/* AI Strategy Diagnosis Interactive Link / Button */}
                      <button
                        onClick={() =>
                          setSelectedStockForStrategy({
                            symbol: holding.symbol,
                            companyName: holding.name || holding.companyName || holding.symbol,
                          })
                        }
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 transition-all transform hover:scale-105 border ${recommendation === 'BUY'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/70 hover:bg-emerald-900/60'
                          : recommendation === 'SELL'
                            ? 'bg-rose-950/60 text-rose-400 border-rose-800/70 hover:bg-rose-900/60'
                            : 'bg-amber-950/60 text-amber-400 border-amber-800/70 hover:bg-amber-900/60'
                          }`}
                        title="Click to view full AI multi-strategy diagnostics and scores"
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Signal: {recommendation}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </button>
                    </div>
                  </td>

                  {/* Stock-level Execution Mode: Paperless vs Actual */}
                  <td className="py-4 px-4 text-center">
                    <div className="inline-flex rounded-lg p-0.5 bg-[#0b0f19] border border-slate-700">
                      <button
                        onClick={() => handleToggleExecutionMode(holding, 'PAPERLESS')}
                        disabled={updatingSymbol === holding.symbol}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${execMode === 'PAPERLESS'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
                          }`}
                      >
                        Paper
                      </button>
                      <button
                        onClick={() => handleToggleExecutionMode(holding, 'ACTUAL')}
                        disabled={updatingSymbol === holding.symbol}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${execMode === 'ACTUAL'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200'
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
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-xs"
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
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 hover:text-rose-400 hover:border-rose-800/60 border border-slate-700 text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1"
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

      {/* STRATEGY DIAGNOSTICS BREAKDOWN MODAL */}
      <StrategyDiagnosticsModal
        isOpen={Boolean(selectedStockForStrategy)}
        symbol={selectedStockForStrategy?.symbol || null}
        companyName={selectedStockForStrategy?.companyName}
        onClose={() => setSelectedStockForStrategy(null)}
        onNavigateToStrategies={onNavigateToStrategies}
        onOpenTradeModal={(stock) => {
          setSelectedStockForStrategy(null);
          openTradeModal(stock);
        }}
      />

      {/* STRATEGIC LOOP CONFIG MODAL */}
      <StrategicLoopConfigModal
        isOpen={Boolean(selectedStockForLoopConfig)}
        target={selectedStockForLoopConfig}
        onClose={() => setSelectedStockForLoopConfig(null)}
        onSaved={(updated) => {
          setLocalOverrides((prev) => ({
            ...prev,
            [updated.symbol]: {
              ...prev[updated.symbol],
              runStrategicLoop: updated.runStrategicLoop,
              executionMode: updated.executionMode,
              targetProfitMarginPct: updated.targetProfitMarginPct,
              stopLossMarginPct: updated.stopLossMarginPct,
              autoBuyEnabled: updated.autoBuyEnabled,
              autoSellEnabled: updated.autoSellEnabled,
              maxQuantity: updated.maxQuantity,
            },
          }));
        }}
      />

      {/* VOLUME & FLOW STRATEGY MULTI-PERIOD MODAL */}
      <VolumeStrategyModal
        isOpen={Boolean(selectedStockForVolume)}
        target={selectedStockForVolume}
        onClose={() => setSelectedStockForVolume(null)}
        onOpenTradeModal={(stock) => {
          setSelectedStockForVolume(null);
          openTradeModal(stock);
        }}
      />

      {/* DYNAMIC STOCK KEY INFORMATION & DUAL EXECUTION MODAL */}
      {selectedStockForExecution && (
        <StockDetailExecutionModal
          isOpen={Boolean(selectedStockForExecution)}
          symbol={selectedStockForExecution.symbol}
          companyName={selectedStockForExecution.companyName}
          currentPrice={selectedStockForExecution.currentPrice}
          costBasis={selectedStockForExecution.costBasis}
          ownedShares={selectedStockForExecution.ownedShares}
          initialMode={selectedStockForExecution.initialMode}
          onClose={() => setSelectedStockForExecution(null)}
          onExecutionComplete={() => {
            setSelectedStockForExecution(null);
          }}
        />
      )}
    </div>
  );
};

