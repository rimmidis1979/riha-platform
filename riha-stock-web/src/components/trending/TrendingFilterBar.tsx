import React from 'react';
import { TrendingFilters, SentimentType, FilingType, AiRecommendation } from '../../types/trending';
import { Filter, Search, DollarSign, FileText, Newspaper, BrainCircuit, Star } from 'lucide-react';

interface TrendingFilterBarProps {
  filters: TrendingFilters;
  setFilters: React.Dispatch<React.SetStateAction<TrendingFilters>>;
  totalResults: number;
}

export const TrendingFilterBar: React.FC<TrendingFilterBarProps> = ({
  filters,
  setFilters,
  totalResults,
}) => {
  return (
    <div className="onyx-card rounded-2xl p-5 border border-zinc-800 space-y-4">
      {/* Top Search & Primary Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search trending stocks by ticker, company, or catalyst (e.g. NVDA, AI, Blackwell)..."
            value={filters.searchQuery}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Personalized Watchlist Quick Toggle */}
        <button
          onClick={() => setFilters((prev) => ({ ...prev, onlyPersonalized: !prev.onlyPersonalized }))}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all border ${
            filters.onlyPersonalized
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-lg shadow-amber-500/10'
              : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white'
          }`}
        >
          <Star className={`w-4 h-4 ${filters.onlyPersonalized ? 'fill-amber-400 text-amber-400' : ''}`} />
          <span>Personalized Selection Only</span>
        </button>
      </div>

      {/* Filter Row: Price Limits, News, Filings, AI Prediction */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-zinc-800/80 text-xs font-mono">
        {/* 1. Stock Price Limits */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-zinc-400 uppercase">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Price Limit (Max: ${filters.maxPrice})</span>
          </label>
          <input
            type="range"
            min="10"
            max="500"
            step="10"
            value={filters.maxPrice}
            onChange={(e) => setFilters((prev) => ({ ...prev, maxPrice: parseInt(e.target.value, 10) }))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-zinc-500">
            <span>$10</span>
            <span className="text-emerald-400 font-bold">${filters.maxPrice}</span>
            <span>$500+</span>
          </div>
        </div>

        {/* 2. Stock News & Catalysts */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-zinc-400 uppercase">
            <Newspaper className="w-3.5 h-3.5 text-sky-400" />
            <span>News Sentiment</span>
          </label>
          <select
            value={filters.sentiment}
            onChange={(e) => setFilters((prev) => ({ ...prev, sentiment: e.target.value as any }))}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All News Sentiments</option>
            <option value="BULLISH">Bullish Catalysts Only</option>
            <option value="NEUTRAL">Neutral / Macro Updates</option>
            <option value="BEARISH">Bearish / Pullbacks</option>
          </select>
        </div>

        {/* 3. SEC Filings */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-zinc-400 uppercase">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>SEC Regulatory Filings</span>
          </label>
          <select
            value={filters.filingType}
            onChange={(e) => setFilters((prev) => ({ ...prev, filingType: e.target.value as any }))}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All SEC Filings</option>
            <option value="8-K">Form 8-K (Material Events)</option>
            <option value="10-Q">Form 10-Q (Quarterly Financials)</option>
            <option value="FORM 4">Form 4 (Insider Buying/Selling)</option>
            <option value="10-K">Form 10-K (Annual Audited)</option>
          </select>
        </div>

        {/* 4. AI Predictions & Sentiment */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-zinc-400 uppercase">
            <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Prediction Rating</span>
          </label>
          <select
            value={filters.aiPrediction}
            onChange={(e) => setFilters((prev) => ({ ...prev, aiPrediction: e.target.value as any }))}
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All AI Predictions</option>
            <option value="STRONG_BUY">Strong Buy (High Alpha)</option>
            <option value="BUY">Buy (Consensus)</option>
            <option value="SPECULATIVE_BUY">Speculative Breakout</option>
          </select>
        </div>
      </div>

      {/* Filter Stats & Reset */}
      <div className="flex items-center justify-between pt-2 text-xs text-zinc-400">
        <span>Showing <strong className="text-white font-mono">{totalResults}</strong> matching trending securities</span>
        <button
          onClick={() =>
            setFilters({
              searchQuery: '',
              minPrice: 0,
              maxPrice: 500,
              sentiment: 'ALL',
              filingType: 'ALL',
              aiPrediction: 'ALL',
              sector: 'ALL',
              onlyPersonalized: false,
            })
          }
          className="text-zinc-500 hover:text-emerald-400 transition-colors font-mono"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};
