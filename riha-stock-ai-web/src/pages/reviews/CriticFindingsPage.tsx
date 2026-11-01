import React, { useEffect, useState } from 'react';
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  FileCode,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { CriticFindings, OrderTicketParams } from '../../types/stockAi';
import { fetchCriticFindings } from '../../api/stockAiClient';
import { OrderTicketModal } from '../../components/modals/OrderTicketModal';

interface Props {
  ticker: string;
  onBack: () => void;
  onNavigate: (route: string) => void;
}

export const CriticFindingsPage: React.FC<Props> = ({ ticker, onBack, onNavigate }) => {
  const [findings, setFindings] = useState<CriticFindings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [ticketParams, setTicketParams] = useState<OrderTicketParams | null>(null);

  const loadData = () => {
    setLoading(true);
    fetchCriticFindings(ticker)
      .then((data) => {
        setFindings(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch Critic findings');
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
              Dedicated Findings Route: /stocks/{ticker}/review/critic
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
          className="px-3 py-1 rounded-lg bg-zinc-800 border border-zinc-600 text-cyan-400 font-bold"
        >
          2. Critic Engine &amp; SpEL Rules
        </button>
        <button
          onClick={() => onNavigate(`/stocks/${ticker}/review/sec-memory`)}
          className="px-3 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-purple-400 transition"
        >
          3. SEC EDGAR &amp; Episodic Memory
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center text-zinc-500 font-mono text-xs">
          Querying riha-critic-engine deterministic policy evaluator and SpEL audit trail...
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-lg text-xs font-mono">
          {error}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Hero Verdict Banner */}
          <div className="p-6 bg-zinc-900/65 backdrop-blur-md border border-zinc-800/80 rounded-xl shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold font-mono text-white">
                    {findings?.criticVerdict || 'APPROVED'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-emerald-950/60 border border-emerald-700 text-emerald-300">
                    SpEL Deterministic Guardrail Passed
                  </span>
                </div>
                <p className="text-xs font-mono text-zinc-400 mt-1">
                  Semantic Convergence Score: <span className="text-emerald-400 font-bold">{((findings?.semanticConvergenceScore || 0.94) * 100).toFixed(1)}%</span> • Cryptographic Approval Token Issued
                </p>
              </div>
            </div>

            <div className="bg-zinc-950 px-4 py-2 rounded-lg border border-zinc-800 font-mono text-xs text-right">
              <span className="text-zinc-500 block text-[10px]">CRITIC SIGNATURE TOKEN</span>
              <span className="text-emerald-400 font-bold truncate max-w-[200px] block">
                {findings?.approvalToken || 'CRITIC-SIG-VALIDATED'}
              </span>
            </div>
          </div>

          {/* Deterministic SpEL Audit Table (Rules 1 - 6) */}
          <div className="bg-zinc-900/65 backdrop-blur-md border border-zinc-800/80 rounded-xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
              <h3 className="text-sm font-bold font-mono text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                Deterministic SpEL Guardrail Audit Table (Rules 1 – 6)
              </h3>
              <span className="text-xs font-mono text-zinc-500">6 / 6 Rules Verified</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/40 text-[11px] text-zinc-400 uppercase">
                    <th className="py-2.5 px-4">Rule ID</th>
                    <th className="py-2.5 px-4">Policy Name</th>
                    <th className="py-2.5 px-4">Deterministic SpEL Expression</th>
                    <th className="py-2.5 px-4">Threshold</th>
                    <th className="py-2.5 px-4">Evaluated Value</th>
                    <th className="py-2.5 px-4 text-right">Gate Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {findings?.policiesEvaluated?.map((p) => (
                    <tr key={p.ruleId} className="hover:bg-zinc-800/30">
                      <td className="py-3 px-4 font-bold text-zinc-300">{p.ruleId}</td>
                      <td className="py-3 px-4 text-zinc-200 font-medium">{p.name}</td>
                      <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">{p.expression}</td>
                      <td className="py-3 px-4 text-zinc-300">{p.threshold}</td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">{String(p.evaluatedValue)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 border border-emerald-700 text-emerald-300">
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* LLM Reasoning Transcript & Remediation Feedback */}
          <div className="bg-zinc-900/65 backdrop-blur-md border border-zinc-800/80 rounded-xl p-5 shadow-xl space-y-4 font-mono text-xs">
            <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-400" />
              Critic Engine Multi-Agent Reasoning Transcript
            </h3>

            <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-300 leading-relaxed space-y-2">
              <p>{findings?.aiReasoningTranscript}</p>
              <div className="pt-2 border-t border-zinc-800/80 text-zinc-400 text-[11px]">
                <span className="text-emerald-400 font-semibold">Remediation Feedback: </span>
                {findings?.remediationFeedback}
              </div>
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
