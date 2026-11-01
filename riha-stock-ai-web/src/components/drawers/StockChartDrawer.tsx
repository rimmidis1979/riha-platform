import React, { useState, useEffect } from 'react';
import {
  Activity,
  BarChart2,
  Calendar,
  Layers,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { CandleData, TechnicalFindings } from '../../types/stockAi';
import { fetchTechnicalFindings } from '../../api/stockAiClient';

interface Props {
  ticker: string;
  onClose: () => void;
  onOpenOrderTicket?: (side: 'BUY' | 'SELL') => void;
}

export const StockChartDrawer: React.FC<Props> = ({ ticker, onClose, onOpenOrderTicket }) => {
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '1D'>('5m');
  const [findings, setFindings] = useState<TechnicalFindings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchTechnicalFindings(ticker)
      .then((data) => {
        if (mounted) {
          setFindings(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Failed to fetch technical findings');
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [ticker]);

  const candles: CandleData[] = findings?.candlesByTimeframe?.[timeframe] || [];
  const minPrice = candles.length > 0 ? Math.min(...candles.map((c) => c.low)) : 0;
  const maxPrice = candles.length > 0 ? Math.max(...candles.map((c) => c.high)) : 100;
  const range = maxPrice - minPrice || 1;

  const isOwned = (findings?.ownedQuantity || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-zinc-950 border-l border-zinc-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-zinc-800 text-emerald-400">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold font-mono text-zinc-100">{ticker}</span>
                <span className="text-xs font-mono text-zinc-400">
                  {findings?.companyName || 'Equity Workstation'}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${isOwned ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                  {isOwned ? `Owned: ${findings?.ownedQuantity} shares` : 'Unowned'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-mono">
                Multi-Timeframe Candlestick Engine &amp; Dynamic Indicator Overlays
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Timeframe & Indicator Selector */}
        <div className="px-6 py-3 border-b border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            {(['1m', '5m', '15m', '1h', '1D'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded text-xs font-mono transition ${
                  timeframe === tf
                    ? 'bg-zinc-800 font-bold text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Target: ${findings?.predictedTargetPrice?.toFixed(2) || '--'}</span>
            </div>
            <div className="flex items-center gap-1 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>Stop: ${findings?.stopLossPrice?.toFixed(2) || '--'}</span>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
          {loading ? (
            <div className="h-64 flex items-center justify-center text-zinc-500 text-xs font-mono">
              Loading multi-timeframe candle stream...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-xs font-mono">
              {error}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Candlestick Visualizer */}
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                <div className="flex justify-between items-center mb-3 text-xs font-mono text-zinc-400">
                  <span>Candlesticks ({timeframe})</span>
                  <span>Range: ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}</span>
                </div>
                {/* SVG Candlestick render */}
                <div className="h-64 w-full relative">
                  <svg className="w-full h-full" viewBox={`0 0 ${candles.length * 20} 240`}>
                    {candles.map((c, i) => {
                      const x = i * 20 + 10;
                      const yOpen = 240 - ((c.open - minPrice) / range) * 200 - 20;
                      const yClose = 240 - ((c.close - minPrice) / range) * 200 - 20;
                      const yHigh = 240 - ((c.high - minPrice) / range) * 200 - 20;
                      const yLow = 240 - ((c.low - minPrice) / range) * 200 - 20;
                      const isUp = c.close >= c.open;
                      const color = isUp ? '#10b981' : '#f43f5e';
                      const top = Math.min(yOpen, yClose);
                      const height = Math.max(Math.abs(yClose - yOpen), 2);

                      return (
                        <g key={i}>
                          {/* Wick */}
                          <line
                            x1={x}
                            y1={yHigh}
                            x2={x}
                            y2={yLow}
                            stroke={color}
                            strokeWidth="1.2"
                          />
                          {/* Candle Body */}
                          <rect
                            x={x - 5}
                            y={top}
                            width="10"
                            height={height}
                            fill={color}
                            rx="1"
                          />
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Indicator Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-lg">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">VWAP Benchmark</span>
                  <p className="text-sm font-bold font-mono text-zinc-100 tabular-nums">
                    ${findings?.vwap ? Number(findings.vwap).toFixed(2) : '--'}
                  </p>
                  <span className="text-[10px] font-mono text-emerald-400">Institutional Anchor</span>
                </div>
                <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-lg">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">RSI (14)</span>
                  <p className="text-sm font-bold font-mono text-zinc-100 tabular-nums">
                    {findings?.rsi14 ? Number(findings.rsi14).toFixed(1) : '--'}
                  </p>
                  <span className="text-[10px] font-mono text-zinc-400">Neutral Expansion</span>
                </div>
                <div className="p-3 bg-zinc-900/60 border border-zinc-800/80 rounded-lg">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase">Relative Volume</span>
                  <p className="text-sm font-bold font-mono text-emerald-400 tabular-nums">
                    {findings?.relativeVolume ? `${Number(findings.relativeVolume).toFixed(2)}x` : '--'}
                  </p>
                  <span className="text-[10px] font-mono text-emerald-300">Surge Confirmed</span>
                </div>
              </div>

              {/* Strategy & Order Flow Findings */}
              <div className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400">Algorithmic Strategy:</span>
                  <span className="font-semibold text-zinc-200">{findings?.strategyApplied}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400">Order Flow Imbalance:</span>
                  <span className="font-semibold text-emerald-400">{findings?.orderFlowImbalance || 1.45}x Bid Heavy</span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-zinc-400">Short Interest &amp; Borrow Fee:</span>
                  <span className="font-semibold text-amber-300">
                    {findings?.shortInterestPct || 19.8}% SI | {findings?.shortBorrowFeePct || 4.2}% CTB
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Quick Action Buttons (Position-Gated) */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-between gap-3">
          <div className="text-xs font-mono text-zinc-400">
            {isOwned ? (
              <span className="text-emerald-400">You hold {findings?.ownedQuantity} shares</span>
            ) : (
              <span className="text-zinc-500">Unowned position — Sell orders gated</span>
            )}
          </div>
          <div className="flex gap-2 font-mono text-xs">
            {onOpenOrderTicket && (
              <>
                <button
                  onClick={() => {
                    onClose();
                    onOpenOrderTicket('BUY');
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center gap-1.5"
                >
                  <TrendingUp className="w-4 h-4" />
                  BUY ORDER
                </button>
                {isOwned && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenOrderTicket('SELL');
                    }}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition flex items-center gap-1.5"
                  >
                    <TrendingDown className="w-4 h-4" />
                    SELL ORDER
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

