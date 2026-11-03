import React from 'react';
import { TrendingFilters } from '../../types/trending';
import { Search, DollarSign, BrainCircuit, Star, RefreshCw, SlidersHorizontal, Layers } from 'lucide-react';

interface TrendingFilterBarProps {
  filters: TrendingFilters;
  setFilters: React.Dispatch<React.SetStateAction<TrendingFilters>>;
  totalResults: number;
  onRunStrategy: () => void;
  isScanning: boolean;
}

export const TrendingFilterBar: React.FC<TrendingFilterBarProps> = ({
  filters,
  setFilters,
  totalResults,
  onRunStrategy,
  isScanning,
}) => {
  return (
    <div className="bg-[#111827] rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4">
      {/* Top Search & Primary Action */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ticker, company name, or filing..."
            value={filters.searchQuery}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
          />
        </div>

        {/* Strategy Shortlist Runner Button & Watchlist Filter */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilters((prev) => ({ ...prev, onlyPersonalized: !prev.onlyPersonalized }))}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
              filters.onlyPersonalized
                ? 'bg-amber-950/60 text-amber-400 border-amber-800/70 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
            }`}
          >
            <Star className={`w-4 h-4 ${filters.onlyPersonalized ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
            <span>Personalized Only</span>
          </button>

          <button
            onClick={onRunStrategy}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-60"
          >
            {isScanning ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : (
              <BrainCircuit className="w-4 h-4 text-white" />
            )}
            <span>{isScanning ? 'Evaluating RAG Strategy...' : 'Run Strategy & Shortlist'}</span>
          </button>
        </div>
      </div>

      {/* Base Filters Grid: Limits, Decimal Price (0.00 to 1500.00), Strategy Algorithm */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-800 text-xs">
        {/* 1. Limit / Number of Stocks to Fetch (Default: 25) */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-slate-400 font-mono font-semibold uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Fetch Limit ({filters.limit} Stocks)</span>
          </label>
          <select
            value={filters.limit}
            onChange={(e) => setFilters((prev) => ({ ...prev, limit: parseInt(e.target.value, 10) }))}
            className="w-full py-2 px-3 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="10">10 Stocks</option>
            <option value="25">25 Stocks (Default Base)</option>
            <option value="50">50 Stocks</option>
            <option value="100">100 Stocks</option>
          </select>
        </div>

        {/* 2. Price Range: 0.00 to 1500.00 with Decimal Precision */}
        <div className="space-y-1.5">
          <label className="flex items-center justify-between text-slate-400 font-mono font-semibold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Price Range ($0 - $1500)</span>
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              ${filters.minPrice.toFixed(2)} - ${filters.maxPrice.toFixed(2)}
            </span>
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">$</span>
              <input
                type="number"
                min="0"
                max="1500"
                step="0.01"
                value={filters.minPrice}
                onChange={(e) => setFilters((prev) => ({ ...prev, minPrice: Math.max(0, parseFloat(e.target.value) || 0) }))}
                placeholder="0.00"
                className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-[#0b0f19] border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <span className="text-slate-500 font-bold">-</span>
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">$</span>
              <input
                type="number"
                min="0"
                max="1500"
                step="0.01"
                value={filters.maxPrice}
                onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: Math.min(1500, parseFloat(e.target.value) || 1500) }))}
                placeholder="1500.00"
                className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-[#0b0f19] border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 3. Discovery Strategy Algorithm */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-slate-400 font-mono font-semibold uppercase tracking-wider">
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Scanning Algorithm</span>
          </label>
          <select
            value={filters.algorithm}
            onChange={(e) => setFilters((prev) => ({ ...prev, algorithm: e.target.value as any }))}
            className="w-full py-2 px-3 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="TOP_GAINERS_DAY">Top Gainers (Session Highs)</option>
            <option value="RVOL_BREAKOUT">RVOL Breakout (&gt; 1.5x)</option>
            <option value="SHORT_SQUEEZE_MICROCAP">Short Squeeze Pressure</option>
            <option value="VWAP_RECLAIM_MOMENTUM">VWAP Reclaim Momentum</option>
            <option value="HIGH_CONVICTION_MULTI_FACTOR">High Conviction Multi-Factor</option>
            <option value="ALL">All Algorithmic Signals</option>
          </select>
        </div>

        {/* 4. AI Recommendation Filter */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-slate-400 font-mono font-semibold uppercase tracking-wider">
            <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI Signal Filter</span>
          </label>
          <select
            value={filters.aiPrediction}
            onChange={(e) => setFilters((prev) => ({ ...prev, aiPrediction: e.target.value as any }))}
            className="w-full py-2 px-3 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Recommendations</option>
            <option value="STRONG_BUY">Strong Buy (High Conviction)</option>
            <option value="BUY">Buy</option>
            <option value="HOLD">Hold</option>
          </select>
        </div>
      </div>

      {/* Results Count & Active Filters Indicator */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
        <span className="font-mono">
          Showing <strong className="text-slate-100">{totalResults}</strong> candidate stocks
        </span>
        <button
          onClick={() =>
            setFilters({
              searchQuery: '',
              minPrice: 0.0,
              maxPrice: 1500.0,
              limit: 25,
              sentiment: 'ALL',
              filingType: 'ALL',
              aiPrediction: 'ALL',
              sector: 'ALL',
              onlyPersonalized: false,
              algorithm: 'TOP_GAINERS_DAY',
            })
          }
          className="text-indigo-400 hover:text-indigo-300 font-mono hover:underline"
        >
          Reset to Default Base Filters
        </button>
      </div>
    </div>
  );
};
