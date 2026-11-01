import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart2,
  Calendar,
  Layers,
  Lock,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { CandleData, OrderTicketParams, TechnicalFindings } from '../../types/stockAi';
import { fetchTechnicalFindings } from '../../api/stockAiClient';
import { OrderTicketModal } from '../../components/modals/OrderTicketModal';

interface Props {
  ticker: string;
  onBack: () => void;
  onNavigate: (route: string) => void;
}

export const TechnicalFindingsPage: React.FC<Props> = ({ ticker, onBack, onNavigate }) => {
  const [findings, setFindings] = useState<TechnicalFindings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '1D'>('5m');
  const [ticketParams, setTicketParams] = useState<OrderTicketParams | null>(null);

  const loadData = () => {
    setLoading(true);
    fetchTechnicalFindings(ticker)
      .then((data) => {
        setFindings(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch technical findings');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [ticker]);

  const isOwned = (findings?.ownedQuantity || 0) > 0;
  const ownedQty = findings?.ownedQuantity || 0;
  const candles: CandleData[] = findings?.candlesByTimeframe?.[timeframe] || [];
  const minPrice = candles.length > 0 ? Math.min(...candles.map((c) => c.low)) : 0;
  const maxPrice = candles.length > 0 ? Math.max(...candles.map((c) => c.high)) : 100;
  const range = maxPrice - minPrice || 1;

  return (
    <div className="space-y-6">
      {/* Sticky Top Header */}
      <div className="sticky top-16 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono text-white">{ticker}</span>
              <span className="text-xs font-mono text-zinc-400">{findings?.companyName}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${isOwned ? 'bg-emerald-950/50 border-emerald-700 text-emerald-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                {isOwned ? `${ownedQty} Shares Owned` : '0 Shares Owned (Unowned)'}
              </span>
            </div>
            <p className="text-[11px] font-mono text-zinc-500">
              Dedicated Findings Route: /stocks/{ticker}/review/technical
            </p>
          </div>
        </div>

        {/* Quick Position-Gated Buy/Sell Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setTicketParams({
                ticker,
                initialSide: 'BUY',
                price: findings?.livePrice || 100,
                targetPrice: findings?.predictedTargetPrice,
                stopLossPrice: findings?.stopLossPrice,
                ownedQuantity: ownedQty,
              })
            }
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-md"
          >
            <ArrowUpRight className="w-4 h-4" />
            Quick Buy
          </button>
          {isOwned ? (
            <button
              onClick={() =>
                setTicketParams({
                  ticker,
                  initialSide: 'SELL',
                  price: findings?.livePrice || 100,
                  targetPrice: findings?.predictedTargetPrice,
                  stopLossPrice: findings?.stopLossPrice,
                  ownedQuantity: ownedQty,
                })
              }
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-md"
            >
              <ArrowDownRight className="w-4 h-4" />
              Quick Sell ({ownedQty} Shs)
            </button>
          ) : (
            <div className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 text-xs font-mono flex items-center gap-1.5 opacity-60">
              <Lock className="w-3.5 h-3.5" />
              <span>Sell Gated (Unowned)</span>
            </div>
          )}
        </div>
      </div>

      {/* Cross-Review Navigation Pills */}
      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="text-zinc-500">Deep Findings Pages:</span>
        <button
          className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-600 text-emerald-400 font-bold"
        >
          1. Technical &amp; Order Flow
        </button>
        <button
          onClick={() => onNavigate(`/stocks/${ticker}/review/critic`)}
          className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-cyan-400 transition"
        >
          2. Critic Engine &amp; SpEL Rules
        </button>
        <button
          onClick={() => onNavigate(`/stocks/${ticker}/review/sec-memory`)}
          className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-purple-400 transition"
        >
          3. SEC EDGAR &amp; Episodic Memory
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-zinc-500 font-mono text-xs">
          Loading live quantitative indicators from riha-stock-ai-market-ingestor...
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-lg text-xs font-mono">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Chart Section */}
          <div className="bg-zinc-900/65 backdrop-blur-md border border-zinc-800/80 rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold font-mono tabular-nums text-white">
                  ${findings?.livePrice?.toFixed(2)}
                </span>
                <span className="text-xs font-mono text-emerald-400">
                  Target: ${findings?.predictedTargetPrice?.toFixed(2)}
                </span>
                <span className="text-xs font-mono text-rose-400">
                  Stop: ${findings?.stopLossPrice?.toFixed(2)}
                </span>
              </div>

              {/* Timeframe Selector */}
              <div className="flex gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
                {(['1m', '5m', '15m', '1h', '1D'] as const).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1 rounded transition ${
                      timeframe === tf ? 'bg-zinc-800 font-bold text-white' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Candlestick Visualization */}
            <div className="h-72 w-full bg-zinc-950/60 border border-zinc-800 rounded-lg p-3">
              <svg className="w-full h-full" viewBox={`0 0 ${candles.length * 24} 260`}>
                {candles.map((c, i) => {
                  const x = i * 24 + 12;
                  const yOpen = 260 - ((c.open - minPrice) / range) * 220 - 20;
                  const yClose = 260 - ((c.close - minPrice) / range) * 220 - 20;
                  const yHigh = 260 - ((c.high - minPrice) / range) * 220 - 20;
                  const yLow = 260 - ((c.low - minPrice) / range) * 220 - 20;
                  const isUp = c.close >= c.open;
                  const color = isUp ? '#10b981' : '#f43f5e';
                  const top = Math.min(yOpen, yClose);
                  const height = Math.max(Math.abs(yClose - yOpen), 3);

                  return (
                    <g key={i}>
                      <line x1={x} y1={yHigh} x2={x} y2={yLow} stroke={color} strokeWidth="1.2" />
                      <rect x={x - 6} y={top} width="12" height={height} fill={color} rx="1" />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Quantitative Indicator Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-zinc-900/65 backdrop-blur-md border border-zinc-800/80 rounded-xl space-y-1">
              <span className="text-[11px] font-mono text-zinc-500 uppercase block">VWAP Benchmark</span>
              <p className="text-xl font-bold font-mono text-white tabular-nums">${findings?.vwap?.toFixed(2)}</p>
              <span className="text-[10px] font-mono text-emerald-400">Institutional Baseline</span>
            </div>
            <div className="p-4 bg-zinc-900/65 backdrop-blur-md border border-zinc-800/80 rounded-xl space-y-1">
              <span className="text-[11px] font-mono text-zinc-500 uppercase block">RSI (14-Period)</span>
              <p className="text-xl font-bold font-mono text-white tabular-nums">{findings?.rsi14?.toFixed(1)}</p>
              <span className="text-[10px] font-mono text-zinc-400">Bullish Momentum Expansion</span>
            </div>
            <div className="p-4 bg-zinc-900/65 backdrop-blur-md border border-zinc-800/80 rounded-xl space-y-1">
              <span className="text-[11px] font-mono text-zinc-500 uppercase block">Relative Volume</span>
              <p className="text-xl font-bold font-mono text-emerald-400 tabular-nums">{findings?.relativeVolume?.toFixed(2)}x</p>
              <span className="text-[10px] font-mono text-emerald-300">Surge Confirmed</span>
            </div>
            <div className="p-4 bg-zinc-900/65 backdrop-blur-md border border-zinc-800/80 rounded-xl space-y-1">
              <span className="text-[11px] font-mono text-zinc-500 uppercase block">Order Flow Ratio</span>
              <p className="text-xl font-bold font-mono text-cyan-400 tabular-nums">{findings?.orderFlowImbalance || 1.45}x</p>
              <span className="text-[10px] font-mono text-cyan-300">Bid Spread Heavy</span>
            </div>
          </div>

          {/* Strategy Execution Log */}
          <div className="p-5 bg-zinc-900/65 backdrop-blur-md border border-zinc-800/80 rounded-xl space-y-3 font-mono text-xs">
            <h3 className="font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Node Execution &amp; Signal Trace
            </h3>
            <div className="space-y-2">
              {findings?.executionLog?.map((log, idx) => (
                <div key={idx} className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-zinc-800 text-emerald-300 font-bold text-[10px]">
                      {log.event}
                    </span>
                    <span className="text-zinc-300">{log.status}</span>
                  </div>
                  <span className="text-zinc-500 text-[10px]">{log.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Order Ticket Modal */}
      {ticketParams && (
        <OrderTicketModal
          params={ticketParams}
          onClose={() => setTicketParams(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};

