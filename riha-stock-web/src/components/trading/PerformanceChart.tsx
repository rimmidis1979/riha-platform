import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { Timeframe } from '../../types/trading';
import { TrendingUp, TrendingDown, Calendar, BarChart2 } from 'lucide-react';

export const PerformanceChart: React.FC = () => {
  const { timeframe, setTimeframe, performanceData } = useTrading();
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

  const portfolioPath = performanceData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.portfolioValue)}`)
    .join(' ');

  const areaPath = `${portfolioPath} L ${getX(performanceData.length - 1)} ${height - padding.bottom} L ${getX(0)} ${height - padding.bottom} Z`;

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
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
      {/* Chart Header & Timeframe Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>Overall Performance ({timeframes.find((t) => t.key === timeframe)?.label})</span>
          </div>

          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-3xl font-extrabold font-mono text-slate-900">
              ${activePoint.portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span
              className={`flex items-center text-sm font-mono font-bold px-2 py-0.5 rounded-lg ${
                isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
              }`}
            >
              {isPositive ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
              {isPositive ? '+' : ''}${Math.abs(activePoint.netGain).toFixed(2)} ({isPositive ? '+' : ''}
              {activePoint.percentChange.toFixed(2)}%)
            </span>
          </div>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{activePoint.label}</p>
        </div>

        {/* Timeframe Buttons: 1D, 1W, 1M, 1Y, ALL */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
          {timeframes.map((tf) => (
            <button
              key={tf.key}
              onClick={() => {
                setTimeframe(tf.key);
                setHoveredPoint(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all ${
                timeframe === tf.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {tf.key}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Interactive Chart */}
      <div className="relative w-full overflow-hidden pt-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id="blueAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563EB" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padding.left}
            y1={getY(minVal + (maxVal - minVal) * 0.75)}
            x2={width - padding.right}
            y2={getY(minVal + (maxVal - minVal) * 0.75)}
            stroke="#F1F5F9"
            strokeDasharray="4 4"
          />
          <line
            x1={padding.left}
            y1={getY(minVal + (maxVal - minVal) * 0.5)}
            x2={width - padding.right}
            y2={getY(minVal + (maxVal - minVal) * 0.5)}
            stroke="#F1F5F9"
            strokeDasharray="4 4"
          />
          <line
            x1={padding.left}
            y1={getY(minVal + (maxVal - minVal) * 0.25)}
            x2={width - padding.right}
            y2={getY(minVal + (maxVal - minVal) * 0.25)}
            stroke="#F1F5F9"
            strokeDasharray="4 4"
          />

          {/* Benchmark Line (S&P 500) */}
          <path
            d={benchmarkPath}
            fill="none"
            stroke="#CBD5E1"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* Area Fill */}
          <path d={areaPath} fill="url(#blueAreaGrad)" />

          {/* Main Portfolio Value Line */}
          <path
            d={portfolioPath}
            fill="none"
            stroke="#2563EB"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Hover Crosshair and Dot */}
          {activePointIndex !== null && (
            <g>
              <line
                x1={getX(activePointIndex)}
                y1={padding.top}
                x2={getX(activePointIndex)}
                y2={height - padding.bottom}
                stroke="#94A3B8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(activePointIndex)}
                cy={getY(activePoint.portfolioValue)}
                r="5"
                fill="#2563EB"
                stroke="#FFFFFF"
                strokeWidth="2.5"
              />
            </g>
          )}

          {/* Invisible interactive hover rects */}
          {performanceData.map((_, i) => (
            <rect
              key={i}
              x={getX(i) - (width / performanceData.length) / 2}
              y={0}
              width={width / performanceData.length}
              height={height}
              fill="transparent"
              onMouseEnter={() => setHoveredPoint(i)}
            />
          ))}
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-3 h-1 bg-blue-600 rounded-full" />
              <span>Personalized Portfolio</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-slate-400 border-dashed" />
              <span>S&amp;P 500 Benchmark</span>
            </span>
          </div>
          <span className="text-[11px] font-mono">Real-Time Continuous Mark-to-Market</span>
        </div>
      </div>
    </div>
  );
};
