import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { Star, Plus, ArrowUpRight, ArrowDownRight, Zap, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { getStockName, TickerHoverLabel } from '../../utils/stockNames';

interface PersonalizedWatchlistProps {
  onExploreMore?: () => void;
}

export const PersonalizedWatchlist: React.FC<PersonalizedWatchlistProps> = ({ onExploreMore }) => {
  const { personalizedWatchlist, togglePersonalizedStock, openTradeModal } = useTrading();

  if (personalizedWatchlist.length === 0) {
    return (
      <div className="bg-[#111827] rounded-2xl p-12 text-center border border-slate-800 shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-400">
          <Star className="w-7 h-7 fill-amber-400/20" />
        </div>
        <h3 className="text-lg font-bold text-slate-100">Your Personalized Watchlist is Empty</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-6">
          Star any trending stock from the scanner to pin it to your personal selection, monitor real-time prices, and execute orders with 1-click.
        </p>
        {onExploreMore && (
          <button
            onClick={onExploreMore}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-2 shadow-md transition-all"
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
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span>Your Personalized Selection ({personalizedWatchlist.length} Monitored Assets)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Live quotes and instant order execution for your selected stocks</p>
        </div>

        {onExploreMore && (
          <button
            onClick={onExploreMore}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 font-mono"
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
              className="bg-[#111827] rounded-2xl border border-slate-800 p-4 hover:border-indigo-500/50 hover:shadow-2xl transition-all flex flex-col justify-between shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <TickerHoverLabel
                        ticker={stock.symbol}
                        name={stock.companyName}
                        badgeClassName="text-slate-100 text-lg font-bold"
                      />
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono border border-slate-700">
                        {stock.sector}
                      </span>
                    </div>
                    <div
                      title={getStockName(stock.symbol, stock.companyName)}
                      className="text-xs text-slate-400 truncate max-w-[170px] mt-0.5 font-sans cursor-pointer hover:text-slate-200"
                    >
                      {getStockName(stock.symbol, stock.companyName)}
                    </div>
                  </div>

                  <button
                    onClick={() => togglePersonalizedStock(stock.symbol)}
                    title="Remove from personalized selection"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 flex items-baseline justify-between">
                  <div className="text-2xl font-black font-mono text-slate-100">
                    ${stock.price.toFixed(2)}
                  </div>
                  <span
                    className={`flex items-center font-bold text-xs font-mono px-2 py-0.5 rounded-md ${isPositive ? 'text-emerald-400 bg-emerald-950/70 border border-emerald-800/60' : 'text-rose-400 bg-rose-950/70 border border-rose-800/60'
                      }`}
                  >
                    {isPositive ? <TrendingUp className="w-3.5 h-3.5 mr-1" /> : <TrendingDown className="w-3.5 h-3.5 mr-1" />}
                    {isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">
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
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-all"
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
