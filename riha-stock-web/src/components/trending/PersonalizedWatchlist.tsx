import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { Star, Plus, ArrowUpRight, ArrowDownRight, Zap, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

interface PersonalizedWatchlistProps {
  onExploreMore?: () => void;
}

export const PersonalizedWatchlist: React.FC<PersonalizedWatchlistProps> = ({ onExploreMore }) => {
  const { personalizedWatchlist, togglePersonalizedStock, openTradeModal } = useTrading();

  if (personalizedWatchlist.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-4 text-amber-500">
          <Star className="w-7 h-7 fill-amber-500/20" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">Your Personalized Watchlist is Empty</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
          Star any trending stock from the scanner to pin it to your personal selection, monitor real-time prices, and execute orders with 1-click.
        </p>
        {onExploreMore && (
          <button
            onClick={onExploreMore}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-all"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>Browse Trending Stocks</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Your Personalized Selection ({personalizedWatchlist.length} Monitored Assets)</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Live quotes and instant order execution for your selected stocks</p>
        </div>

        {onExploreMore && (
          <button
            onClick={onExploreMore}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add More Stocks</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {personalizedWatchlist.map((stock) => {
          const isPositive = stock.change >= 0;

          return (
            <div
              key={stock.symbol}
              className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-lg">{stock.symbol}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                        {stock.sector}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate max-w-[170px] mt-0.5">
                      {stock.companyName}
                    </div>
                  </div>

                  <button
                    onClick={() => togglePersonalizedStock(stock.symbol)}
                    title="Remove from personalized selection"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 flex items-baseline justify-between">
                  <div className="text-2xl font-black font-mono text-slate-900">
                    ${stock.price.toFixed(2)}
                  </div>
                  <span
                    className={`flex items-center font-bold text-xs font-mono px-2 py-0.5 rounded-md ${
                      isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                    }`}
                  >
                    {isPositive ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
                    {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-500">
                  Vol: {stock.volume}
                </span>

                <button
                  onClick={() =>
                    openTradeModal({
                      symbol: stock.symbol,
                      companyName: stock.companyName,
                      currentPrice: stock.price,
                      defaultSide: 'BUY',
                    })
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-all"
                >
                  Quick Trade
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
