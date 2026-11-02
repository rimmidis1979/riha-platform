import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { Star, Plus, ArrowUpRight, ArrowDownRight, Zap, Trash2 } from 'lucide-react';

interface PersonalizedWatchlistProps {
  onExploreMore: () => void;
}

export const PersonalizedWatchlist: React.FC<PersonalizedWatchlistProps> = ({ onExploreMore }) => {
  const { personalizedWatchlist, togglePersonalizedStock, openTradeModal } = useTrading();

  if (personalizedWatchlist.length === 0) {
    return (
      <div className="onyx-card rounded-2xl p-12 text-center border border-zinc-800">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400">
          <Star className="w-7 h-7 fill-amber-400/20" />
        </div>
        <h3 className="text-lg font-bold text-white">Your Personalized Selection is Empty</h3>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1 mb-6">
          Star any high-alpha stock from the Trending Stocks scanner to monitor live breakouts, receive SEC filing alerts, and trade with one click.
        </p>
        <button
          onClick={onExploreMore}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs font-mono inline-flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-transform hover:scale-105"
        >
          <Zap className="w-4 h-4 fill-current" />
          Browse Trending Stocks Now
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            Your Personalized Selection ({personalizedWatchlist.length} Monitored Assets)
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">Custom watchlist with live market tracking and one-click order execution</p>
        </div>

        <button
          onClick={onExploreMore}
          className="text-xs font-mono text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Add More Stocks
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {personalizedWatchlist.map((stock) => {
          const isPositive = stock.change >= 0;

          return (
            <div
              key={stock.symbol}
              className="onyx-card rounded-2xl border border-zinc-800/90 p-4 hover:border-amber-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center font-bold font-mono text-white text-xs border border-zinc-700">
                      {stock.symbol}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm font-mono flex items-center gap-1.5">
                        {stock.symbol}
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 font-normal">
                          {stock.sector}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate max-w-[150px]">{stock.companyName}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => togglePersonalizedStock(stock.symbol)}
                    title="Remove from personalized list"
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Price */}
                <div className="flex items-baseline justify-between mt-3 pb-2 border-b border-zinc-800/60">
                  <div className="text-xl font-bold font-mono text-white">
                    ${stock.price.toFixed(2)}
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-mono font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    <span>
                      {isPositive ? '+' : ''}${Math.abs(stock.change).toFixed(2)} ({isPositive ? '+' : ''}
                      {stock.changePercent.toFixed(2)}%)
                    </span>
                  </div>
                </div>

                {/* Catalyst */}
                <p className="text-[11px] text-zinc-300 mt-2 line-clamp-2 leading-relaxed">
                  {stock.recentNews.headline}
                </p>
              </div>

              {/* Action */}
              <div className="pt-3 mt-3 border-t border-zinc-800/70 flex items-center gap-2">
                <button
                  onClick={() =>
                    openTradeModal({
                      symbol: stock.symbol,
                      companyName: stock.companyName,
                      currentPrice: stock.price,
                      defaultSide: 'BUY',
                    })
                  }
                  className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs font-mono flex items-center justify-center gap-1 shadow-sm transition-transform hover:scale-[1.02]"
                >
                  <Zap className="w-3 h-3 fill-current" />
                  Buy {stock.symbol}
                </button>

                <button
                  onClick={() =>
                    openTradeModal({
                      symbol: stock.symbol,
                      companyName: stock.companyName,
                      currentPrice: stock.price,
                      defaultSide: 'SELL',
                    })
                  }
                  className="py-1.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-mono"
                >
                  Sell
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
