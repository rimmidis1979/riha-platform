import React, { useState, useMemo } from 'react';
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
  Sliders,
  BarChart2,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { StrategyDiagnosticsModal } from './StrategyDiagnosticsModal';
import { StrategicLoopConfigModal, StrategicLoopConfigTarget } from './StrategicLoopConfigModal';
import { VolumeStrategyModal, VolumeStrategyTarget, formatVolNumber } from './VolumeStrategyModal';
import { StockDetailExecutionModal } from './StockDetailExecutionModal';
import { DestructiveConfirmModal } from '../common/DestructiveConfirmModal';
import { getStockName, TickerHoverLabel } from '../../utils/stockNames';

type SortField = 'symbol' | 'shares' | 'avgCost' | 'currentPrice' | 'equity' | 'totalGain' | 'volume';
type SortDirection = 'asc' | 'desc';

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

  // Density control state ('comfortable' = 14-16px vertical padding, 'dense' = 8-10px)
  const [density, setDensity] = useState<'comfortable' | 'dense'>('comfortable');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('equity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Destructive double confirmation state
  const [isDisableAllModalOpen, setIsDisableAllModalOpen] = useState(false);
  const [isDisablingAll, setIsDisablingAll] = useState(false);

  // Modals state
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

  const filteredHoldings = useMemo(() => {
    return holdings.filter((h) => {
      if (brokerFilter === 'ALL') return true;
      if (brokerFilter === 'ROBINHOOD') return !h.broker || h.broker === 'ROBINHOOD';
      if (brokerFilter === 'CHARLES_SCHWAB') return h.broker === 'CHARLES_SCHWAB';
      return true;
    });
  }, [holdings, brokerFilter]);

  // Sorted holdings
  const sortedHoldings = useMemo(() => {
    const list = [...filteredHoldings];
    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (sortField) {
        case 'symbol':
          valA = a.symbol;
          valB = b.symbol;
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        case 'shares':
          valA = Number(a.shares) || 0;
          valB = Number(b.shares) || 0;
          break;
        case 'avgCost':
          valA = a.avgCost || 0;
          valB = b.avgCost || 0;
          break;
        case 'currentPrice':
          valA = a.currentPrice || 0;
          valB = b.currentPrice || 0;
          break;
        case 'equity':
          valA = a.equity || 0;
          valB = b.equity || 0;
          break;
        case 'totalGain':
          valA = a.totalGain || 0;
          valB = b.totalGain || 0;
          break;
        case 'volume':
          valA = a.volume || 0;
          valB = b.volume || 0;
          break;
        default:
          return 0;
      }

      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
    return list;
  }, [filteredHoldings, sortField, sortDirection]);

  // Paginated slice
  const totalPages = Math.ceil(sortedHoldings.length / pageSize) || 1;
  const paginatedHoldings = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedHoldings.slice(start, start + pageSize);
  }, [sortedHoldings, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleToggleStrategicLoop = async (holding: Holding) => {
    const currentLoop = localOverrides[holding.symbol]?.runStrategicLoop ?? (holding.runStrategicLoop ?? false);
    const newLoop = !currentLoop;
    const currentMode = localOverrides[holding.symbol]?.executionMode ?? (holding.executionMode ?? 'PAPERLESS');
    const targetProfit = localOverrides[holding.symbol]?.targetProfitMarginPct ?? holding.targetProfitMarginPct ?? 5.0;
    const stopLoss = localOverrides[holding.symbol]?.stopLossMarginPct ?? holding.stopLossMarginPct ?? 3.0;
    const autoBuy = localOverrides[holding.symbol]?.autoBuyEnabled ?? holding.autoBuyEnabled ?? false;
    const autoSell = localOverrides[holding.symbol]?.autoSellEnabled ?? holding.autoSellEnabled ?? false;
    const maxQty = localOverrides[holding.symbol]?.maxQuantity ?? holding.maxQuantity ?? 1;

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

  const handleDisableAllLoops = async () => {
    setIsDisablingAll(true);
    try {
      for (const h of filteredHoldings) {
        await StockApiClient.updateStockStrategicLoop(h.symbol, false, 'PAPERLESS');
      }
      const overrides: any = {};
      filteredHoldings.forEach((h) => {
        overrides[h.symbol] = {
          ...localOverrides[h.symbol],
          runStrategicLoop: false,
        };
      });
      setLocalOverrides((prev) => ({ ...prev, ...overrides }));
      setIsDisableAllModalOpen(false);
    } catch (e) {
      console.error('Failed to disable all loops', e);
    } finally {
      setIsDisablingAll(false);
    }
  };

  const activeLoopsCount = filteredHoldings.filter(
    (h) => localOverrides[h.symbol]?.runStrategicLoop ?? (h.runStrategicLoop ?? false)
  ).length;

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-3 h-3 text-slate-500 opacity-60 inline ml-1" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3 h-3 text-indigo-400 inline ml-1" />
    ) : (
      <ChevronDown className="w-3 h-3 text-indigo-400 inline ml-1" />
    );
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
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md transition-all"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Discover Trending Stocks</span>
          </button>
        )}
      </div>
    );
  }

  // Row and Cell style dynamic padding based on density
  const thPadding = density === 'dense' ? 'py-2 px-3' : 'py-3.5 px-4';
  const tdPadding = density === 'dense' ? 'py-2 px-3' : 'py-3.5 px-4';
  const fontSize = density === 'dense' ? 'text-xs' : 'text-sm';

  return (
    <div className="bg-[#111827] rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
      {/* Table Toolbar Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0e1526]">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            Stocks You Own ({filteredHoldings.length} Active Positions)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Continuous AI Strategic Diagnosis, Paperless vs Actual Execution, and Tabular Precision
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Active Loops Indicator Badge */}
          <span
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-mono ${
              activeLoopsCount > 0
                ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
                : 'bg-slate-800/80 text-slate-400 border-slate-700'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>{activeLoopsCount} Loops Active</span>
          </span>

          {/* Density Toggle Button */}
          <div className="inline-flex rounded-lg p-0.5 bg-[#0b0f19] border border-slate-700">
            <button
              onClick={() => setDensity('comfortable')}
              title="Comfortable Row Spacing (8pt Grid)"
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                density === 'comfortable'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Comfortable
            </button>
            <button
              onClick={() => setDensity('dense')}
              title="Dense Compact Row Spacing"
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-all ${
                density === 'dense'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dense
            </button>
          </div>

          {/* Destructive Action: Disable All Loops */}
          {activeLoopsCount > 0 && (
            <button
              onClick={() => setIsDisableAllModalOpen(true)}
              className="text-[11px] font-mono font-bold text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-900/60 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5"
              title="Double-Confirmation Required"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Stop All Loops</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table with Sticky Header */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-[#161d2d] text-[11px] font-mono uppercase text-slate-400 sticky top-0 z-10 select-none">
              <th
                onClick={() => handleSort('symbol')}
                className={`${thPadding} font-semibold cursor-pointer hover:text-slate-200 transition-colors`}
              >
                <span>Asset / Symbol</span>
                {renderSortIcon('symbol')}
              </th>
              <th
                onClick={() => handleSort('shares')}
                className={`${thPadding} font-semibold text-right cursor-pointer hover:text-slate-200 transition-colors`}
              >
                <span>Shares</span>
                {renderSortIcon('shares')}
              </th>
              <th
                onClick={() => handleSort('avgCost')}
                className={`${thPadding} font-semibold text-right cursor-pointer hover:text-slate-200 transition-colors`}
              >
                <span>Avg Cost</span>
                {renderSortIcon('avgCost')}
              </th>
              <th
                onClick={() => handleSort('currentPrice')}
                className={`${thPadding} font-semibold text-right cursor-pointer hover:text-slate-200 transition-colors`}
              >
                <span>Market Price</span>
                {renderSortIcon('currentPrice')}
              </th>
              <th
                onClick={() => handleSort('equity')}
                className={`${thPadding} font-semibold text-right cursor-pointer hover:text-slate-200 transition-colors`}
              >
                <span>Total Equity</span>
                {renderSortIcon('equity')}
              </th>
              <th
                onClick={() => handleSort('totalGain')}
                className={`${thPadding} font-semibold text-right cursor-pointer hover:text-slate-200 transition-colors`}
              >
                <span>Total Return</span>
                {renderSortIcon('totalGain')}
              </th>
              <th
                onClick={() => handleSort('volume')}
                className={`${thPadding} font-semibold text-center cursor-pointer hover:text-slate-200 transition-colors`}
              >
                <span>Volume &amp; Flow Strategy</span>
                {renderSortIcon('volume')}
              </th>
              <th className={`${thPadding} font-semibold text-center`}>Strategic Loop</th>
              <th className={`${thPadding} font-semibold text-center`}>Mode</th>
              <th className={`${thPadding} font-semibold text-center`}>Trade Options</th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-slate-800/60 font-mono ${fontSize}`}>
            {paginatedHoldings.map((holding: Holding, idx: number) => {
              const isTotalGainPositive = holding.totalGain >= 0;
              const loopActive = localOverrides[holding.symbol]?.runStrategicLoop ?? (holding.runStrategicLoop ?? false);
              const execMode = localOverrides[holding.symbol]?.executionMode ?? (holding.executionMode ?? 'PAPERLESS');
              const recommendation = localOverrides[holding.symbol]?.recommendation ?? (holding.latestRecommendation || 'HOLD');
              const isSchwab = holding.broker === 'CHARLES_SCHWAB';

              return (
                <tr
                  key={holding.symbol}
                  className={`transition-colors duration-300 group ${
                    idx % 2 === 0 ? 'bg-[#111827]/70' : 'bg-[#141d2f]/50'
                  } hover:bg-slate-800/60`}
                >
                  {/* Symbol, Name & Broker Tag */}
                  <td className={tdPadding}>
                    <div className="flex items-center gap-3">
                      <div
                        title={`${holding.symbol} — ${getStockName(holding.symbol, holding.name || holding.companyName)}`}
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs border cursor-pointer hover:scale-105 transition-transform shrink-0 ${
                          isSchwab
                            ? 'bg-sky-950/60 text-sky-300 border-sky-800/60'
                            : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                        }`}
                      >
                        {holding.symbol.substring(0, 3)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <TickerHoverLabel
                            ticker={holding.symbol}
                            name={holding.name || holding.companyName}
                            badgeClassName="text-slate-100 text-sm font-bold"
                          />
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border shrink-0 ${
                              isSchwab
                                ? 'bg-sky-950/80 text-sky-300 border-sky-800/60'
                                : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                            }`}
                          >
                            {isSchwab ? 'Schwab' : 'Robinhood'}
                          </span>
                        </div>
                        <span
                          title={getStockName(holding.symbol, holding.name || holding.companyName)}
                          className="text-xs text-slate-400 truncate max-w-[140px] block mt-0.5 font-sans cursor-pointer hover:text-slate-200"
                        >
                          {getStockName(holding.symbol, holding.name || holding.companyName)}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Quantity - Tabular Numerals, Right-aligned */}
                  <td className={`${tdPadding} text-right font-mono font-bold text-slate-200 tabular-nums`}>
                    {typeof holding.shares === 'number'
                      ? holding.shares < 0.001
                        ? holding.shares.toExponential(2)
                        : holding.shares.toLocaleString()
                      : holding.shares}
                  </td>

                  {/* Avg Cost - Tabular Numerals, Right-aligned */}
                  <td className={`${tdPadding} text-right font-mono text-slate-400 tabular-nums`}>
                    ${holding.avgCost ? holding.avgCost.toFixed(2) : '0.00'}
                  </td>

                  {/* Current Price - Tabular Numerals, Right-aligned */}
                  <td className={`${tdPadding} text-right font-mono font-bold text-slate-100 tabular-nums`}>
                    ${holding.currentPrice ? holding.currentPrice.toFixed(2) : '0.00'}
                  </td>

                  {/* Total Equity - Tabular Numerals, Right-aligned */}
                  <td className={`${tdPadding} text-right font-mono font-bold text-slate-100 tabular-nums`}>
                    ${(holding.equity || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>

                  {/* Total Return - Tabular Numerals, Right-aligned */}
                  <td className={`${tdPadding} text-right font-mono tabular-nums`}>
                    <div
                      className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-md tabular-nums ${
                        isTotalGainPositive
                          ? 'text-emerald-400 bg-emerald-950/70 border border-emerald-800/60'
                          : 'text-rose-400 bg-rose-950/70 border border-rose-800/60'
                      }`}
                    >
                      {isTotalGainPositive ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                      {isTotalGainPositive ? '+' : ''}${Math.abs(holding.totalGain || 0).toFixed(2)} ({isTotalGainPositive ? '+' : ''}
                      {(holding.totalGainPercent || 0).toFixed(2)}%)
                    </div>
                  </td>

                  {/* Volume & Flow Strategy */}
                  <td className={`${tdPadding} text-center`}>
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
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="font-bold text-slate-100 text-xs tabular-nums">
                              {formatVolNumber(stockVol)}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border tabular-nums ${volBadgeClass}`}>
                              {rvol.toFixed(1)}x
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
                            title="Click to view full volume strategy breakdown"
                          >
                            <BarChart2 className="w-2.5 h-2.5" />
                            <span>{volStrategyLabel}</span>
                          </button>
                        </div>
                      );
                    })()}
                  </td>

                  {/* Strategic Loop: Manual Toggle & Diagnostics */}
                  <td className={`${tdPadding} text-center`}>
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
                          <div
                            className={`w-5 h-3 rounded-full p-0.5 transition-colors flex items-center ${
                              loopActive ? 'bg-emerald-500 justify-end' : 'bg-slate-700 justify-start'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-white shadow-xs" />
                          </div>
                        </button>

                        {/* 1-Time Apply Strategy */}
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
                        className="flex items-center gap-1.5 text-[9px] font-mono cursor-pointer hover:opacity-80 transition-opacity tabular-nums"
                        title="Click to customize Profit Target % and Stop Loss %"
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

                      {/* AI Strategy Diagnosis Button */}
                      <button
                        onClick={() =>
                          setSelectedStockForStrategy({
                            symbol: holding.symbol,
                            companyName: holding.name || holding.companyName || holding.symbol,
                          })
                        }
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 transition-all transform hover:scale-105 border ${
                          recommendation === 'BUY'
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
                  <td className={`${tdPadding} text-center`}>
                    <div className="inline-flex rounded-lg p-0.5 bg-[#0b0f19] border border-slate-700">
                      <button
                        onClick={() => handleToggleExecutionMode(holding, 'PAPERLESS')}
                        disabled={updatingSymbol === holding.symbol}
                        className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                          execMode === 'PAPERLESS'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-slate-200'
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
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Actual
                      </button>
                    </div>
                  </td>

                  {/* Buy / Sell Quick Buttons */}
                  <td className={`${tdPadding} text-center`}>
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

      {/* Pagination Footer */}
      <div className="p-3.5 border-t border-slate-800 bg-[#0e1526] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-[#141b2d] border border-slate-700 rounded-lg px-2 py-1 text-slate-200 font-mono text-xs focus:outline-none"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-slate-600">•</span>
          <span className="tabular-nums">
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, sortedHoldings.length)} of {sortedHoldings.length} positions
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-2 text-slate-300 font-bold tabular-nums">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
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

      {/* DESTRUCTIVE DOUBLE-CONFIRMATION MODAL */}
      <DestructiveConfirmModal
        isOpen={isDisableAllModalOpen}
        title="Stop All Auto-Strategy Loops?"
        description="This will immediately deactivate autonomous loop monitoring on all your stock positions. No automated buys or sells will execute until you re-enable them manually."
        confirmKeyword="STOP LOOPS"
        confirmButtonText="Deactivate All Loops"
        onConfirm={handleDisableAllLoops}
        onClose={() => setIsDisableAllModalOpen(false)}
        isProcessing={isDisablingAll}
      />
    </div>
  );
};
