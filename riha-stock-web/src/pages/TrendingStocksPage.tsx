import React, { useState, useMemo } from 'react';
import { useTrading } from '../context/TradingContext';
import { TrendingFilterBar } from '../components/trending/TrendingFilterBar';
import { TrendingStockCard } from '../components/trending/TrendingStockCard';
import { PersonalizedWatchlist } from '../components/trending/PersonalizedWatchlist';
import { Flame, Star, Activity, Sparkles, RefreshCw } from 'lucide-react';

export const TrendingStocksPage: React.FC = () => {
  const {
    trendingStocks,
    personalizedWatchlist,
    filters,
    setFilters,
    runPromptStrategyShortlist,
    isScanning,
  } = useTrading();

  const [activeView, setActiveView] = useState<'all' | 'personalized'>('all');

  // Filter stocks based on base filters
  const filteredStocks = useMemo(() => {
    return trendingStocks.filter((stock) => {
      // 1. Search Query
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchesSymbol = stock.symbol.toLowerCase().includes(query);
        const matchesName = stock.companyName.toLowerCase().includes(query);
        const matchesHeadline = stock.recentNews?.headline.toLowerCase().includes(query);
        const matchesTags = stock.tags?.some((t) => t.toLowerCase().includes(query));
        if (!matchesSymbol && !matchesName && !matchesHeadline && !matchesTags) {
          return false;
        }
      }

      // 2. Price Limits (Decimals considered, 0 to 1500)
      if (stock.price > filters.maxPrice || stock.price < filters.minPrice) {
        return false;
      }

      // 3. AI Prediction Filter
      if (filters.aiPrediction !== 'ALL' && stock.aiPrediction !== filters.aiPrediction) {
        return false;
      }

      // 4. Personalized Only Filter
      if (filters.onlyPersonalized && !stock.isPersonalized) {
        return false;
      }

      return true;
    });
  }, [trendingStocks, filters]);

  return (
    <div className="space-y-6">
      {/* Page Title & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
              <Flame className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Market Movers &amp; Trending Stocks
            </h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Real-time scanner evaluated through the 5-node agentic momentum trading prompt and SEC 30-min filing catalysts.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center p-1 bg-white border border-slate-200 rounded-xl shadow-sm self-start sm:self-auto">
          <button
            onClick={() => setActiveView('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeView === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>All Candidates ({filteredStocks.length})</span>
          </button>

          <button
            onClick={() => setActiveView('personalized')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeView === 'personalized'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${personalizedWatchlist.length > 0 ? 'fill-current' : ''}`} />
            <span>Personalized ({personalizedWatchlist.length})</span>
          </button>
        </div>
      </div>

      {/* Base Filter Bar */}
      <TrendingFilterBar
        filters={filters}
        setFilters={setFilters}
        totalResults={activeView === 'all' ? filteredStocks.length : personalizedWatchlist.length}
        onRunStrategy={runPromptStrategyShortlist}
        isScanning={isScanning}
      />

      {/* Main Grid View */}
      {activeView === 'personalized' ? (
        <PersonalizedWatchlist />
      ) : (
        <div>
          {isScanning ? (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900">Scanning Live Feeds &amp; RAG Playbooks</h3>
              <p className="text-xs text-slate-500 mt-1">
                Evaluating candidate stocks against the Momentum Trading Analyst prompt...
              </p>
            </div>
          ) : filteredStocks.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredStocks.map((stock) => (
                <TrendingStockCard key={stock.symbol} stock={stock} />
              ))}
            </div>
          ) : (
            <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800">No stocks match current filter criteria</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Try widening your price range ($0 - $1500) or reset filters to display all live movers.
              </p>
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
                className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                Reset to Default (25 Stocks)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
