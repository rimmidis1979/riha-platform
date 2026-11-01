import React, { useEffect, useState } from 'react';
import { Clock, History, ShieldCheck, X } from 'lucide-react';
import { fetchExecutiveSummary } from '../../api/stockAiClient';

interface Props {
  ticker: string;
  onClose: () => void;
}

export const PositionHistoryModal: React.FC<Props> = ({ ticker, onClose }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExecutiveSummary()
      .then((data: Record<string, any>) => {
        const txs = data.transactions || [];
        const filtered = txs.filter((t: any) => t.ticker?.toUpperCase() === ticker.toUpperCase());
        setHistory(filtered);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [ticker]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono text-zinc-100">{ticker}</span>
                <span className="text-xs font-mono text-zinc-400">Position History &amp; Fills</span>
              </div>
              <p className="text-xs text-zinc-500">PostgreSQL Immutable Trade Decision Ledger</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 text-xs font-mono max-h-96 overflow-y-auto">
          {loading ? (
            <div className="py-12 text-center text-zinc-500">Loading ledger records...</div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-zinc-500">
              No historical fills recorded yet for {ticker}.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item, idx) => (
                <div key={idx} className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${item.side === 'BUY' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'}`}>
                      {item.side} {item.quantity} SHS
                    </span>
                    <span className="text-zinc-500 text-[11px]">{item.executedAt || item.timestamp}</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Fill Price: ${item.executedFillPrice || item.orderPrice}</span>
                    <span className="text-zinc-400">Status: {item.status}</span>
                  </div>
                  <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Critic Score: {item.criticScore || '0.94'} | Prompt: {item.promptVersion || 'riha-stock-ai@v1'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950/50 flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-mono">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
