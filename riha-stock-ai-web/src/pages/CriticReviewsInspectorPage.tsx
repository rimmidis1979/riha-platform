import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import {
  fetchCriticRiskGuardrails,
  fetchMasterAuditSummary,
  ProblemDetailError,
  updateCriticRiskGuardrails,
} from '../api/stockAiClient';
import {
  AiTradeAuditTrail,
  CriticRiskGuardrails,
  Rfc7807ProblemDetail,
} from '../types/stockAi';
import { ProblemDetailBanner } from '../components/ProblemDetailBanner';

export const CriticReviewsInspectorPage: React.FC = () => {
  const [guardrails, setGuardrails] = useState<CriticRiskGuardrails | null>(null);
  const [auditList, setAuditList] = useState<AiTradeAuditTrail[]>([]);
  const [maxPositionInput, setMaxPositionInput] = useState<number>(15000);
  const [maxDrawdownInput, setMaxDrawdownInput] = useState<number>(3.0);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<Rfc7807ProblemDetail | null>(null);

  const loadCriticData = useCallback(async () => {
    try {
      setProblem(null);
      const [rules, summary] = await Promise.all([
        fetchCriticRiskGuardrails(),
        fetchMasterAuditSummary('ALL'),
      ]);
      setGuardrails(rules);
      setMaxPositionInput(Number(rules.maxPositionSizeUsd));
      setMaxDrawdownInput(Number(rules.maxDailyDrawdownLimitPct));
      setAuditList(summary.auditTrail);
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    }
  }, []);

  useEffect(() => {
    loadCriticData();
  }, [loadCriticData]);

  const handleSaveGuardrails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateCriticRiskGuardrails({
        maxPositionSizeUsd: maxPositionInput,
        maxDailyDrawdownLimitPct: maxDrawdownInput,
      });
      setGuardrails(updated);
    } catch (err) {
      if (err instanceof ProblemDetailError) {
        setProblem(err.problem);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg font-bold tracking-tight text-white">
              Critic Review &amp; Deterministic SpEL Risk Gate Inspector
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            Inspects every stock evaluated by riha-critic-engine (:8085) against the 4 deterministic SpEL guardrails and semantic convergence threshold (0.85).
          </p>
        </div>

        <form onSubmit={handleSaveGuardrails} className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5">
            <Sliders className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-400">Max Position $:</span>
            <input
              type="number"
              value={maxPositionInput}
              onChange={(e) => setMaxPositionInput(Number(e.target.value))}
              className="w-24 bg-transparent text-white font-bold focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5">
            <span className="text-zinc-400">Max Drawdown %:</span>
            <input
              type="number"
              step="0.1"
              value={maxDrawdownInput}
              onChange={(e) => setMaxDrawdownInput(Number(e.target.value))}
              className="w-16 bg-transparent text-white font-bold focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold flex items-center gap-1.5 transition"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Updating...' : 'Save SpEL Limits'}
          </button>
        </form>
      </div>

      {problem && <ProblemDetailBanner problem={problem} onRetry={loadCriticData} />}

      {/* Active SpEL Rules Panel */}
      {guardrails && (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 mb-2.5 font-semibold">
            Registered Deterministic SpEL Risk Guardrails (Contract: {guardrails.contractId})
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(guardrails.spelRules || []).map((rule, idx) => (
              <div
                key={idx}
                className="bg-zinc-950 border border-zinc-800/80 rounded-lg px-3 py-2 text-xs font-mono text-emerald-300 flex items-center gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{rule}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Critic Evaluation Ledger */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between text-xs font-mono">
          <span className="font-semibold text-zinc-200 uppercase">
            Per-Stock Critic Gate Verdicts ({auditList.length} Evaluations)
          </span>
          <span className="text-zinc-400">
            Semantic Convergence Threshold: &ge; 0.85
          </span>
        </div>

        <div className="divide-y divide-zinc-800/80">
          {auditList.map((item) => {
            const approved = item.criticSpelVerdict === 'APPROVED';
            const positionNotional = Number(item.limitPrice || 0) * Number(item.quantity || 0);

            return (
              <div key={item.auditId} className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 text-xs font-mono">
                    <span className="text-sm font-bold text-white px-2.5 py-0.5 rounded bg-zinc-950 border border-zinc-700">
                      {item.ticker}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded font-semibold border flex items-center gap-1 ${
                        approved
                          ? 'bg-emerald-950/80 border-emerald-600/70 text-emerald-300'
                          : 'bg-rose-950/90 border-rose-600/70 text-rose-300'
                      }`}
                    >
                      {approved ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <ShieldAlert className="w-3.5 h-3.5" />
                      )}
                      {item.criticSpelVerdict}
                    </span>
                    <span className="text-zinc-400">
                      Convergence: <strong className="text-white">{(Number(item.criticConvergenceScore) * 100).toFixed(1)}%</strong>
                    </span>
                    <span className="text-zinc-400">
                      Notional: <strong className="text-zinc-200">${positionNotional.toFixed(2)}</strong>
                    </span>
                    <span className="text-zinc-500">
                      Stop-Loss: ${Number(item.stopLossPrice).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-zinc-400">
                    {item.criticRemediationReason}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono shrink-0">
                  <span className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-300">
                    Signal: {item.aiRecommendation}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-zinc-400">
                    {item.executionStatus}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

