import React, { useState, useMemo } from 'react';
import { useTrading } from '../context/TradingContext';
import { TrendingFilters, TrendingStock } from '../types/trending';
import { TrendingFilterBar } from '../components/trending/TrendingFilterBar';
import { TrendingStockCard } from '../components/trending/TrendingStockCard';
import { PersonalizedWatchlist } from '../components/trending/PersonalizedWatchlist';
import { Flame, Star, Activity, BarChart2, ShieldCheck } from 'lucide-react';

export const TrendingStocksPage: React.FC = () => {
  const { trendingStocks, personalizedWatchlist } = useTrading();

  const [activeView, setActiveView] = useState<'all' | 'personalized'>('all');

  const [filters, setFilters] = useState<TrendingFilters>({
    searchQuery: '',
    minPrice: 0,
    maxPrice: 500,
    sentiment: 'ALL',
    filingType: 'ALL',
    aiPrediction: 'ALL',
    sector: 'ALL',
    onlyPersonalized: false,
  });

  // Multi-attribute filtering logic
  const filteredStocks = useMemo(() => {
    return trendingStocks.filter((stock) => {
      // 1. Search Query (Ticker, company, tags, catalyst)
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchesSymbol = stock.symbol.toLowerCase().includes(query);
        const matchesName = stock.companyName.toLowerCase().includes(query);
        const matchesHeadline = stock.recentNews.headline.toLowerCase().includes(query);
        const matchesTags = stock.tags.some((t) => t.toLowerCase().includes(query));
        if (!matchesSymbol && !matchesName && !matchesHeadline && !matchesTags) {
          return false;
        }
      }

      // 2. Stock Price Limits
      if (stock.price > filters.maxPrice || stock.price < filters.minPrice) {
        return false;
      }

      // 3. News Sentiment Filter
      if (filters.sentiment !== 'ALL' && stock.recentNews.sentiment !== filters.sentiment) {
        return false;
      }

      // 4. SEC Filings Filter
      if (filters.filingType !== 'ALL') {
        if (!stock.recentFiling || stock.recentFiling.formType !== filters.filingType) {
          return false;
        }
      }

      // 5. AI Predictions & Score Filter
      if (filters.aiPrediction !== 'ALL' && stock.aiPrediction !== filters.aiPrediction) {
        return false;
      }

      // 6. Only Personalized Filter
      if (filters.onlyPersonalized && !stock.isPersonalized) {
        return false;
      }

      return true;
    });
  }, [trendingStocks, filters]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Trending Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl onyx-card border border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-sky-400 font-semibold flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              Live Market Scanner • High-Alpha Momentum
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1">
            Trending Stocks & Catalysts
          </h1>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Real-time scanner filtering price limits, news catalysts, SEC regulatory filings, and AI sentiment scores.
          </p>
        </div>

        {/* View Switcher: All Trending vs My Personalized Selection */}
        <div className="flex items-center bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 text-xs font-mono">
          <button
            onClick={() => {
              setActiveView('all');
              setFilters((prev) => ({ ...prev, onlyPersonalized: false }));
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeView === 'all'
                ? 'bg-zinc-800 text-white font-bold shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4 text-sky-400" />
            <span>All Trending ({trendingStocks.length})</span>
          </button>

          <button
            onClick={() => setActiveView('personalized')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeView === 'personalized'
                ? 'bg-zinc-800 text-amber-400 font-bold shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Star className="w-4 h-4 fill-amber-400" />
            <span>Personalized Watchlist ({personalizedWatchlist.length})</span>
          </button>
        </div>
      </div>

      {activeView === 'personalized' ? (
        <PersonalizedWatchlist onExploreMore={() => setActiveView('all')} />
      ) : (
        <>
          {/* Multi-Dimensional Filter Bar */}
          <TrendingFilterBar
            filters={filters}
            setFilters={setFilters}
            totalResults={filteredStocks.length}
          />

          {/* Trending Stock Cards Grid */}
          {filteredStocks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredStocks.map((stock) => (
                <TrendingStockCard key={stock.symbol} stock={stock} />
              ))}
            </div>
          ) : (
            <div className="onyx-card rounded-2xl p-12 text-center border border-zinc-800">
              <BarChart2 className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No Stocks Match Active Filters</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
                Try widening your price limits, selecting All Sentiments, or clearing your search query.
              </p>
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
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-emerald-400 transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
