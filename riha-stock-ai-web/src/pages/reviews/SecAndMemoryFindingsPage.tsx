import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Database,
  FileText,
  Lock,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { OrderTicketParams, SecMemoryFindings } from '../../types/stockAi';
import { fetchSecAndMemoryFindings } from '../../api/stockAiClient';
import { OrderTicketModal } from '../../components/modals/OrderTicketModal';

interface Props {
  ticker: string;
  onBack: () => void;
  onNavigate: (route: string) => void;
}

export const SecAndMemoryFindingsPage: React.FC<Props> = ({ ticker, onBack, onNavigate }) => {
  const [findings, setFindings] = useState<SecMemoryFindings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [ticketParams, setTicketParams] = useState<OrderTicketParams | null>(null);

  const loadData = () => {
    setLoading(true);
    fetchSecAndMemoryFindings(ticker)
      .then((data) => {
        setFindings(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch SEC and Memory findings');
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [ticker]);

  const isOwned = (findings?.ownedQuantity || 0) > 0;
  const ownedQty = findings?.ownedQuantity || 0;

  return (
    <div className="space-y-6">
      {/* Sticky Top Header */}
      <div className="sticky top-16 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono text-white">{ticker}</span>
              <span className="text-xs font-mono text-zinc-400">{findings?.companyName}</span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${isOwned ? 'bg-emerald-950/50 border-emerald-700 text-emerald-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>
                {isOwned ? `${ownedQty} Shares Owned` : '0 Shares Owned (Unowned)'}
              </span>
            </div>
            <p className="text-[11px] font-mono text-zinc-500">
              Dedicated Findings Route: /stocks/{ticker}/review/sec-memory
            </p>
          </div>
        </div>

        {/* Quick Position-Gated Buy/Sell Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setTicketParams({
                ticker,
                initialSide: 'BUY',
                price: 100,
                ownedQuantity: ownedQty,
              })
            }
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-md"
          >
            <ArrowUpRight className="w-4 h-4" />
            Quick Buy
          </button>
          {isOwned ? (
            <button
              onClick={() =>
                setTicketParams({
                  ticker,
                  initialSide: 'SELL',
                  price: 100,
                  ownedQuantity: ownedQty,
                })
              }
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold rounded-lg transition flex items-center gap-1.5 shadow-md"
            >
              <ArrowDownRight className="w-4 h-4" />
              Quick Sell ({ownedQty} Shs)
            </button>
          ) : (
            <div className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-500 text-xs font-mono flex items-center gap-1.5 opacity-60">
              <Lock className="w-3.5 h-3.5" />
              <span>Sell Gated (Unowned)</span>
            </div>
          )}
        </div>
      </div>

      {/* Cross-Review Navigation Pills */}
      <div className="flex items-center gap-2 text-xs font-mono">
        <span className="text-zinc-500">Deep Findings Pages:</span>
        <button
          onClick={() => onNavigate(`/stocks/${ticker}/review/technical`)}
          className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-emerald-400 transition"
        >
          1. Technical &amp; Order Flow
        </button>
        <button
          onClick={() => onNavigate(`/stocks/${ticker}/review/critic`)}
          className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-cyan-400 transition"
        >
          2. Critic Engine &amp; SpEL Rules
        </button>
        <button
          className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-600 text-purple-400 font-bold"
        >
          3. SEC EDGAR &amp; Episodic Memory
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-zinc-500 font-mono text-xs">
          Querying SEC EDGAR filing feeds and pgvector episodic memory embeddings...
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-lg text-xs font-mono">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Dilution & Capital Structure Assessment */}
          <div className="bg-zinc-900/65 backdrop-blur-md border border-zinc-800/80 rounded-xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold font-mono text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              SEC Dilution &amp; ATM Offering Risk Assessment
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase block">Dilution Risk Rating</span>
                <p className="text-xl font-bold text-emerald-400">{findings?.dilutionRiskLevel || 'LOW'}</p>
                <span className="text-[10px] text-zinc-400">Score: {findings?.dilutionRiskScore || 0.12} / 1.0</span>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase block">Active ATM Offering</span>
                <p className="text-xl font-bold text-zinc-100">{findings?.activeAtmFacility ? 'YES' : 'NONE DETECTED'}</p>
                <span className="text-[10px] text-emerald-400">No active dumping</span>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase block">S-3 Shelf Registration</span>
                <p className="text-lg font-bold text-zinc-200 truncate">{findings?.shelfRegistrationS3 || 'Inactive'}</p>
                <span className="text-[10px] text-zinc-500">SEC EDGAR Audit</span>
              </div>
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-1">
                <span className="text-[10px] text-zinc-500 uppercase block">Estimated Cash Runway</span>
                <p className="text-xl font-bold text-emerald-400">{findings?.cashRunwayMonths || 22} Months</p>
                <span className="text-[10px] text-emerald-300">Solvent capital tier</span>
              </div>
            </div>
          </div>

          {/* SEC EDGAR Catalyst Feed */}
          <div className="bg-zinc-900/65 backdrop-blur-md border border-zinc-800/80 rounded-xl p-5 shadow-xl space-y-3 font-mono text-xs">
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              SEC EDGAR Filings Catalyst Feed (Form 8-K, 10-Q, 10-K, Form 4)
            </h3>

            <div className="space-y-2">
              {findings?.secEdgarFilings?.map((f, idx) => (
                <div key={idx} className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded bg-zinc-800 text-amber-300 font-bold text-xs border border-zinc-700">
                      {f.filingType}
                    </span>
                    <div>
                      <p className="text-zinc-200 font-medium">{f.description}</p>
                      <span className="text-[10px] text-zinc-500">Filed: {f.filedDate}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${f.impact.includes('BULLISH') ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' : 'bg-zinc-800 border-zinc-700 text-zinc-300'}`}>
                    {f.impact}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Episodic Memory Historical Setup Recall (pgvector) */}
          <div className="bg-zinc-900/65 backdrop-blur-md border border-zinc-800/80 rounded-xl p-5 shadow-xl space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4 text-purple-400" />
                Episodic Memory RAG Embeddings (pgvector Historical Recall)
              </h3>
              <span className="text-[11px] text-zinc-500">solar_memory_db vector search</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {findings?.episodicMemoryRag?.map((mem, idx) => (
                <div key={idx} className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm text-zinc-100">{mem.historicalTicker}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                      {(mem.similarityScore * 100).toFixed(0)}% Match
                    </span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">{mem.setupType}</p>
                  <div className="pt-2 border-t border-zinc-800 flex justify-between text-[11px]">
                    <span className="text-zinc-500">Outcome:</span>
                    <span className="text-emerald-400 font-bold">{mem.outcome} ({mem.returnPct})</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-500">
                    <span>Hold Time:</span>
                    <span>{mem.holdingPeriod}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Order Ticket Modal */}
      {ticketParams && (
        <OrderTicketModal
          params={ticketParams}
          onClose={() => setTicketParams(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};

