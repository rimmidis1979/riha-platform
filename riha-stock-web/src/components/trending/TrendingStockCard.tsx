import React from 'react';
import { TrendingStock } from '../../types/trending';
import { useTrading } from '../../context/TradingContext';
import {
  TrendingUp,
  TrendingDown,
  Star,
  PlusCircle,
  FileText,
  Newspaper,
  BrainCircuit,
  Users,
  Zap,
} from 'lucide-react';

interface TrendingStockCardProps {
  stock: TrendingStock;
}

export const TrendingStockCard: React.FC<TrendingStockCardProps> = ({ stock }) => {
  const { togglePersonalizedStock, openTradeModal } = useTrading();
  const isPositive = stock.change >= 0;

  return (
    <div className="onyx-card rounded-2xl border border-zinc-800 p-5 flex flex-col justify-between hover:border-zinc-700 transition-all group">
      <div>
        {/* Top Header: Ticker, Name, and Manual Personalized Pin Button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-zinc-800 flex items-center justify-center font-mono font-bold text-white text-sm border border-zinc-700 group-hover:border-emerald-500/50 transition-colors">
              {stock.symbol}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-base font-mono">{stock.symbol}</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/90 text-zinc-400 font-medium">
                  {stock.sector}
                </span>
              </div>
              <p className="text-xs text-zinc-400 truncate max-w-[200px] mt-0.5">{stock.companyName}</p>
            </div>
          </div>

          {/* Star Button: Manual Select Trending Stock & Add to Personalized Selection */}
          <button
            onClick={() => togglePersonalizedStock(stock.symbol)}
            title={stock.isPersonalized ? 'Remove from Personalized Selection' : 'Add to Personalized Selection'}
            className={`p-2 rounded-xl transition-all ${
              stock.isPersonalized
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-md shadow-amber-500/10'
                : 'bg-zinc-900/80 text-zinc-500 border border-zinc-800 hover:text-amber-400 hover:bg-zinc-800'
            }`}
          >
            <Star className={`w-5 h-5 ${stock.isPersonalized ? 'fill-amber-400' : ''}`} />
          </button>
        </div>

        {/* Price & Momentum Stats */}
        <div className="flex items-baseline justify-between mt-4 pb-3 border-b border-zinc-800/60">
          <div>
            <div className="text-2xl font-black font-mono text-white">
              ${stock.price.toFixed(2)}
            </div>
            <div className={`flex items-center gap-1 text-xs font-mono font-bold mt-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>
                {isPositive ? '+' : ''}${Math.abs(stock.change).toFixed(2)} ({isPositive ? '+' : ''}
                {stock.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="text-right text-[11px] font-mono text-zinc-400">
            <div>Vol: <strong className="text-zinc-200">{stock.volume}</strong></div>
            <div>Cap: <strong className="text-zinc-200">{stock.marketCap}</strong></div>
          </div>
        </div>

        {/* AI Prediction & Social Sentiment Row */}
        <div className="grid grid-cols-2 gap-2 my-3 text-[11px] font-mono">
          {/* AI Score */}
          <div className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800/80">
            <div className="flex items-center gap-1 text-zinc-400 mb-1">
              <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
              <span>AI Consensus</span>
            </div>
            <div className="font-bold text-purple-300 flex items-center justify-between">
              <span>{stock.aiPrediction.replace('_', ' ')}</span>
              <span className="text-[10px] text-zinc-500">{stock.aiConfidence}%</span>
            </div>
          </div>

          {/* Social Sentiment */}
          <div className="p-2 rounded-xl bg-zinc-900/90 border border-zinc-800/80">
            <div className="flex items-center gap-1 text-zinc-400 mb-1">
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>Social Buzz</span>
            </div>
            <div className="font-bold text-sky-300 flex items-center justify-between">
              <span>{stock.socialSentimentScore}% Bullish</span>
              <span className="text-[10px] text-zinc-500">{(stock.socialMentions24h / 1000).toFixed(1)}k</span>
            </div>
          </div>
        </div>

        {/* News Catalyst Snippet */}
        <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 mb-2">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-sky-400 uppercase font-semibold mb-1">
            <Newspaper className="w-3 h-3" />
            <span>Market Catalyst • {stock.recentNews.publishedAt}</span>
          </div>
          <p className="text-xs text-zinc-300 font-medium line-clamp-2 leading-snug">
            {stock.recentNews.headline}
          </p>
        </div>

        {/* SEC Filing Snippet (if available) */}
        {stock.recentFiling && (
          <div className="p-2 rounded-xl bg-zinc-950/50 border border-zinc-800/60 mb-3 flex items-center justify-between text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-amber-400 truncate pr-2">
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="font-bold">{stock.recentFiling.formType}:</span>
              <span className="text-zinc-400 truncate">{stock.recentFiling.title}</span>
            </div>
            <span className="text-[10px] text-zinc-500 whitespace-nowrap">{stock.recentFiling.filingDate}</span>
          </div>
        )}
      </div>

      {/* Action Bar: Quick Buy & Personalized Toggle */}
      <div className="pt-3 border-t border-zinc-800/80 flex items-center gap-2">
        <button
          onClick={() =>
            openTradeModal({
              symbol: stock.symbol,
              companyName: stock.companyName,
              currentPrice: stock.price,
              defaultSide: 'BUY',
            })
          }
          className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs font-mono flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/10 transition-all hover:scale-[1.02]"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          Quick Buy ${stock.symbol}
        </button>

        <button
          onClick={() => togglePersonalizedStock(stock.symbol)}
          className={`py-2 px-3 rounded-xl border text-xs font-mono font-medium transition-all ${
            stock.isPersonalized
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
          }`}
        >
          {stock.isPersonalized ? 'Pinned' : '+ Pin'}
        </button>
      </div>
    </div>
  );
};
