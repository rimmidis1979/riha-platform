import React, { useEffect, useState } from 'react';
import { Cpu, GitBranch, ShieldAlert, Sparkles, X } from 'lucide-react';
import { StrategyDetails } from '../../types/stockAi';
import { fetchStrategyDetails } from '../../api/stockAiClient';

interface Props {
  ticker: string;
  onClose: () => void;
}

export const AdvancedStrategyModal: React.FC<Props> = ({ ticker, onClose }) => {
  const [details, setDetails] = useState<StrategyDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchStrategyDetails(ticker)
      .then((data) => {
        setDetails(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [ticker]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold font-mono text-zinc-100">{ticker}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-emerald-300">
                  Active DAG Contract
                </span>
              </div>
              <p className="text-xs text-zinc-400">AI Strategy Architecture &amp; Prompt Spec</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs font-mono">
          {loading ? (
            <div className="py-12 text-center text-zinc-500">Querying Version Control Hub...</div>
          ) : (
            <>
              {/* Metadata */}
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Strategy Name:</span>
                  <span className="text-zinc-200 font-semibold">{details?.strategyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Prompt Version (VCH):</span>
                  <span className="text-emerald-400 font-bold">{details?.promptVersion}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">VCH Artifact ID:</span>
                  <span className="text-zinc-300">{details?.vchHubPromptId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">LLM Reasoning Engine:</span>
                  <span className="text-zinc-200">{details?.modelProvider}</span>
                </div>
              </div>

              {/* Consensus Weights */}
              <div>
                <span className="text-zinc-400 font-semibold block mb-2">5-Node Multi-Agent Consensus Weights:</span>
                <div className="grid grid-cols-2 gap-2">
                  {details?.consensusWeights &&
                    Object.entries(details.consensusWeights).map(([node, weight]) => (
                      <div key={node} className="p-2 bg-zinc-950 border border-zinc-800 rounded flex justify-between">
                        <span className="text-zinc-500">{node}:</span>
                        <span className="text-emerald-400 font-bold tabular-nums">{(weight * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Rule Checklist */}
              <div>
                <span className="text-zinc-400 font-semibold block mb-2">Deterministic Policy Checklist:</span>
                <ul className="space-y-1.5">
                  {details?.rulesList?.map((rule, idx) => (
                    <li key={idx} className="p-2 bg-zinc-950/60 border border-zinc-800/80 rounded flex items-start gap-2">
                      <span className="text-emerald-400 mt-0.5">✔</span>
                      <span className="text-zinc-300">{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

