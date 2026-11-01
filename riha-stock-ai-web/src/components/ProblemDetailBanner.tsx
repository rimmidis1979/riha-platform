import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { Rfc7807ProblemDetail } from '../types/stockAi';

interface Props {
  problem: Rfc7807ProblemDetail | null;
  onDismiss?: () => void;
  onRetry?: () => void;
}

export const ProblemDetailBanner: React.FC<Props> = ({ problem, onDismiss, onRetry }) => {
  if (!problem) return null;

  return (
    <div className="onyx-glass border border-red-900/70 bg-red-950/25 rounded-lg p-4 mb-6 text-zinc-100">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 text-xs font-mono uppercase tracking-wider bg-red-900/60 text-red-200 rounded border border-red-700/50">
                RFC 7807 ProblemDetail • HTTP {problem.status}
              </span>
              <span className="px-2 py-0.5 text-xs font-mono bg-zinc-900 text-zinc-300 rounded border border-zinc-800 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-zinc-400" />
                ZERO MOCK DATA POLICY ENFORCED
              </span>
              {problem.service && (
                <span className="text-xs font-mono text-zinc-400">
                  service={problem.service}
                </span>
              )}
            </div>
            <h3 className="text-sm font-semibold text-red-200 mt-1.5">
              {problem.title}
            </h3>
            <p className="text-xs text-zinc-300 mt-1 font-mono leading-relaxed">
              {problem.detail}
            </p>
            {problem.timestamp && (
              <p className="text-[11px] text-zinc-500 font-mono mt-1.5">
                timestamp: {problem.timestamp} | productId: {problem.productId || 'RIHA_STOCK_AI'}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs font-mono text-zinc-200 hover:text-white px-2.5 py-1 rounded border border-zinc-700 hover:border-zinc-500"
            >
              RETRY
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-xs font-mono text-zinc-400 hover:text-zinc-100 px-2 py-1 rounded border border-zinc-800 hover:border-zinc-700"
            >
              DISMISS
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
