import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { Timeframe } from '../../types/trading';
import { TrendingUp, TrendingDown, Calendar, Award } from 'lucide-react';

export const PerformanceChart: React.FC = () => {
  const { timeframe, setTimeframe, performanceData, portfolioSummary } = useTrading();
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  if (performanceData.length === 0) return null;

  // Compute SVG dimensions and scale
  const width = 800;
  const height = 260;
  const padding = { top: 20, right: 30, bottom: 35, left: 20 };

  const activePointIndex = hoveredPoint !== null ? hoveredPoint : performanceData.length - 1;
  const activePoint = performanceData[activePointIndex] || performanceData[performanceData.length - 1];

  const minVal = Math.min(...performanceData.map((d) => Math.min(d.portfolioValue, d.benchmarkValue))) * 0.98;
  const maxVal = Math.max(...performanceData.map((d) => Math.max(d.portfolioValue, d.benchmarkValue))) * 1.02;

  const getX = (index: number) => {
    return padding.left + (index / (performanceData.length - 1)) * (width - padding.left - padding.right);
  };

  const getY = (val: number) => {
    return height - padding.bottom - ((val - minVal) / (maxVal - minVal)) * (height - padding.top - padding.bottom);
  };

  // Generate SVG path for portfolio line
  const portfolioPath = performanceData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.portfolioValue)}`)
    .join(' ');

  // Gradient area path
  const areaPath = `${portfolioPath} L ${getX(performanceData.length - 1)} ${height - padding.bottom} L ${getX(0)} ${height - padding.bottom} Z`;

  // Benchmark path
  const benchmarkPath = performanceData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.benchmarkValue)}`)
    .join(' ');

  const isPositive = activePoint.netGain >= 0;

  const timeframes: { key: Timeframe; label: string }[] = [
    { key: '1D', label: '1 Day' },
    { key: '1W', label: '1 Week' },
    { key: '1M', label: '1 Month' },
    { key: '1Y', label: '1 Year' },
    { key: 'ALL', label: 'All Time' },
  ];

  return (
    <div className="onyx-card rounded-2xl p-6 border border-zinc-800">
      {/* Chart Header & Timeframe Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-zinc-400">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            <span>Overall Portfolio Performance — {timeframe} Timeline</span>
          </div>

          <div className="flex items-baseline gap-3 mt-1.5">
            <span className="text-3xl font-extrabold tracking-tight font-mono text-white">
              ${activePoint.portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>

            <div
              className={`flex items-center gap-1 text-sm font-semibold font-mono px-2.5 py-0.5 rounded-full ${
                isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span>
                {isPositive ? '+' : ''}${activePoint.netGain.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({isPositive ? '+' : ''}
                {activePoint.percentChange.toFixed(2)}%)
              </span>
            </div>

            <span className="text-xs text-zinc-500 font-mono hidden md:inline">
              Point: {activePoint.label}
            </span>
          </div>
        </div>

        {/* Timeframe Selector Buttons */}
        <div className="flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
          {timeframes.map((tf) => (
            <button
              key={tf.key}
              onClick={() => {
                setTimeframe(tf.key);
                setHoveredPoint(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                timeframe === tf.key
                  ? 'bg-emerald-500 text-zinc-950 shadow-md font-bold'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              {tf.key}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart Canvas */}
      <div className="relative w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={getY(maxVal * 0.99)}
            x2={width - padding.right}
            y2={getY(maxVal * 0.99)}
            stroke="#27272a"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <line
            x1={padding.left}
            y1={getY((maxVal + minVal) / 2)}
            x2={width - padding.right}
            y2={getY((maxVal + minVal) / 2)}
            stroke="#27272a"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#3f3f46"
            strokeWidth="1"
          />

          {/* S&P 500 Benchmark Line */}
          <path
            d={benchmarkPath}
            fill="none"
            stroke="#71717a"
            strokeWidth="1.5"
            strokeDasharray="5 5"
            opacity="0.6"
          />

          {/* Portfolio Area Fill */}
          <path d={areaPath} fill="url(#portfolioGradient)" />

          {/* Portfolio Primary Line */}
          <path
            d={portfolioPath}
            fill="none"
            stroke="url(#lineGlow)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Points / Hover Targets */}
          {performanceData.map((point, index) => {
            const cx = getX(index);
            const cy = getY(point.portfolioValue);
            const isHovered = hoveredPoint === index;

            return (
              <g
                key={index}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(index)}
              >
                {/* Hit area */}
                <rect
                  x={cx - 15}
                  y={padding.top}
                  width={30}
                  height={height - padding.top - padding.bottom}
                  fill="transparent"
                />

                {isHovered && (
                  <>
                    {/* Vertical guide line */}
                    <line
                      x1={cx}
                      y1={padding.top}
                      x2={cx}
                      y2={height - padding.bottom}
                      stroke="#10b981"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />

                    {/* Outer pulse */}
                    <circle cx={cx} cy={cy} r="8" fill="#10b981" opacity="0.3" />

                    {/* Core dot */}
                    <circle cx={cx} cy={cy} r="4.5" fill="#ffffff" stroke="#10b981" strokeWidth="2.5" />
                  </>
                )}

                {/* X-axis labels */}
                <text
                  x={cx}
                  y={height - 10}
                  textAnchor="middle"
                  className={`text-[10px] font-mono select-none ${
                    isHovered ? 'fill-emerald-400 font-bold' : 'fill-zinc-500'
                  }`}
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Chart Footer: Benchmark legend & risk metrics */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 mt-2 border-t border-zinc-800/80 text-xs font-mono text-zinc-400">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="w-3 h-1 bg-emerald-400 rounded-full" />
            <span className="text-zinc-200">Your Portfolio Strategy</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-0.5 border-t border-dashed border-zinc-400" />
            <span>S&P 500 Index (SPY Benchmark)</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-emerald-400">
            <Award className="w-3.5 h-3.5" />
            Alpha: <strong className="text-white">+4.2%</strong>
          </span>
          <span>
            Sharpe Ratio: <strong className="text-zinc-200">2.18</strong>
          </span>
          <span>
            Max Drawdown: <strong className="text-zinc-200">-3.4%</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
