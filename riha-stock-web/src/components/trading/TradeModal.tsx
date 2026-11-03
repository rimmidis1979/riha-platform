import React, { useState, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext';
import { useAuth } from '../../context/AuthContext';
import { OrderSide, OrderType } from '../../types/trading';
import { X, ArrowDownRight, ArrowUpRight, DollarSign, AlertCircle, RefreshCw } from 'lucide-react';

export const TradeModal: React.FC = () => {
  const { selectedStockForTrade, closeTradeModal, executeBuy, executeSell, holdings } = useTrading();
  const { user } = useAuth();

  if (!selectedStockForTrade) return null;

  const currentHolding = holdings.find((h) => h.symbol === selectedStockForTrade.symbol);
  const sharesOwned = currentHolding?.shares || 0;
  const cashAvailable = user?.cashBalance || 0.0;

  const [side, setSide] = useState<OrderSide>(selectedStockForTrade.defaultSide || 'BUY');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [shares, setShares] = useState<string>('10');
  const [limitPrice, setLimitPrice] = useState<string>(selectedStockForTrade.currentPrice.toFixed(2));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedStockForTrade.defaultSide) {
      setSide(selectedStockForTrade.defaultSide);
    }
    setLimitPrice(selectedStockForTrade.currentPrice.toFixed(2));
  }, [selectedStockForTrade]);

  const numShares = Math.max(0, parseInt(shares, 10) || 0);
  const effectivePrice = orderType === 'LIMIT' ? parseFloat(limitPrice) || selectedStockForTrade.currentPrice : selectedStockForTrade.currentPrice;
  const totalCost = +(numShares * effectivePrice).toFixed(2);

  const handleSetSharesFraction = (pct: number) => {
    if (side === 'BUY') {
      const maxAffordable = Math.floor(cashAvailable / effectivePrice);
      setShares(Math.max(1, Math.floor(maxAffordable * pct)).toString());
    } else {
      setShares(Math.max(1, Math.floor(sharesOwned * pct)).toString());
    }
  };

  const handleTradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (numShares <= 0) {
      setError('Please enter a valid share quantity greater than 0.');
      return;
    }

    if (side === 'BUY' && totalCost > cashAvailable) {
      setError(`Insufficient cash balance ($${cashAvailable.toLocaleString()}) for $${totalCost.toLocaleString()} purchase.`);
      return;
    }

    if (side === 'SELL' && numShares > sharesOwned) {
      setError(`Cannot sell ${numShares} shares. You currently own ${sharesOwned} shares.`);
      return;
    }

    setIsSubmitting(true);
    let success = false;
    if (side === 'BUY') {
      success = await executeBuy(
        selectedStockForTrade.symbol,
        selectedStockForTrade.companyName,
        numShares,
        effectivePrice,
        orderType
      );
    } else {
      success = await executeSell(
        selectedStockForTrade.symbol,
        selectedStockForTrade.companyName,
        numShares,
        effectivePrice,
        orderType
      );
    }
    setIsSubmitting(false);

    if (!success) {
      setError('Order execution failed. Please verify live market availability.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#111827] rounded-3xl border border-slate-800 shadow-2xl overflow-hidden text-slate-100">
        {/* Modal Top Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#161d2d] border border-slate-700 flex items-center justify-center font-mono font-bold text-indigo-400">
              {selectedStockForTrade.symbol}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 font-mono">{selectedStockForTrade.symbol}</h3>
                <span className="text-xs font-mono font-bold text-slate-300 tabular-nums">
                  ${selectedStockForTrade.currentPrice.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[200px]">{selectedStockForTrade.companyName}</p>
            </div>
          </div>

          <button
            onClick={closeTradeModal}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleTradeSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/70 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* BUY / SELL Switcher */}
          <div className="grid grid-cols-2 p-1 bg-[#0b0f19] rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setSide('BUY')}
              className={`py-2 text-xs font-bold font-mono rounded-lg transition-all flex items-center justify-center gap-1.5 ${side === 'BUY'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>BUY</span>
            </button>
            <button
              type="button"
              onClick={() => setSide('SELL')}
              className={`py-2 text-xs font-bold font-mono rounded-lg transition-all flex items-center justify-center gap-1.5 ${side === 'SELL'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
                }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>SELL</span>
            </button>
          </div>

          {/* Order Type: Market vs Limit */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-semibold font-mono">Order Type:</span>
            <div className="flex items-center gap-2">
              {(['MARKET', 'LIMIT'] as const).map((ot) => (
                <button
                  key={ot}
                  type="button"
                  onClick={() => setOrderType(ot)}
                  className={`px-3 py-1 rounded-lg font-mono font-semibold transition-all border ${orderType === ot
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
                    : 'bg-[#161d2d] text-slate-400 border-slate-700 hover:bg-slate-800'
                    }`}
                >
                  {ot}
                </button>
              ))}
            </div>
          </div>

          {/* Shares Input */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
              <span>Quantity (Shares)</span>
              <span className="text-slate-400 font-mono">
                {side === 'BUY' ? `Max Cash: $${cashAvailable.toLocaleString()}` : `Owned: ${sharesOwned} sh`}
              </span>
            </div>
            <input
              type="number"
              min="1"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#0b0f19] border border-slate-700 rounded-xl text-slate-100 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Limit Price Input if LIMIT order */}
          {orderType === 'LIMIT' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 font-mono">
                Limit Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#0b0f19] border border-slate-700 rounded-xl text-slate-100 text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          )}

          {/* Quick % Buttons */}
          <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-xs">
            {[0.25, 0.5, 0.75, 1.0].map((frac, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSetSharesFraction(frac)}
                className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700 transition-colors"
              >
                {frac === 1.0 ? 'MAX' : `${frac * 100}%`}
              </button>
            ))}
          </div>

          {/* Order Summary Receipt */}
          <div className="p-3.5 rounded-xl bg-[#161d2d] border border-slate-800 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Execution Price:</span>
              <span className="text-slate-200 font-bold tabular-nums">${effectivePrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Estimated Total:</span>
              <span className="text-slate-100 font-black text-sm tabular-nums">${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-700/60">
              <span>Commission:</span>
              <span className="text-emerald-400 font-bold">$0.00 (Zero Fee)</span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || numShares <= 0}
            className={`w-full py-3 rounded-xl font-bold text-sm text-white shadow-md transition-all flex items-center justify-center gap-2 ${side === 'BUY'
              ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
              : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
              } disabled:opacity-50`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing Order...</span>
              </>
            ) : (
              <span>Confirm {side} Order for ${totalCost.toLocaleString()}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
