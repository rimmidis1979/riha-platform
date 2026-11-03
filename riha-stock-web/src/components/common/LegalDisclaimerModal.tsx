import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, AlertTriangle, Scale, CheckCircle2, LogOut, ArrowDown } from 'lucide-react';

interface LegalDisclaimerModalProps {
  isOpen: boolean;
}

export const LegalDisclaimerModal: React.FC<LegalDisclaimerModalProps> = ({ isOpen }) => {
  const { acceptDisclaimer, declineDisclaimer, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      await acceptDisclaimer();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    setIsSubmitting(true);
    try {
      await declineDisclaimer();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#111827] border border-amber-500/40 rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* FIXED HEADER */}
        <div className="p-5 sm:p-6 border-b border-slate-800 bg-[#141b2d] shrink-0 flex items-start gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <Scale className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-800/60 uppercase">
                SEC / FINRA Mandatory Compliance
              </span>
              <span className="text-[11px] text-slate-400 font-mono">Standard v1.0</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
              US Stock Trading &amp; AI Algorithmic Risk Disclaimer
            </h2>
          </div>
        </div>

        {/* SCROLLABLE LEGAL BODY (FITS ANY SCREEN) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs leading-relaxed text-slate-300 font-sans divide-y divide-slate-800/80">
          {/* Highlight Callout */}
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <p className="font-semibold text-[11px] leading-relaxed">
              MANDATORY REGULATORY NOTICE: Trading stocks, equities, options, and algorithmic automated orders involves substantial risk of capital loss. Market volatility, execution latency, and technical slippage can result in losses exceeding initial capital allocations.
            </p>
          </div>

          {/* Section 1 */}
          <div className="pt-3 space-y-1.5">
            <h4 className="font-bold text-slate-100 text-xs">
              1. Non-Advisory Status (No Formal Financial Advice)
            </h4>
            <p className="text-slate-400 leading-normal">
              RIHA Stock AI is an algorithmic quantitative intelligence platform. All recommendations, signals (BUY/SELL/HOLD), VWAP breakout indicators, and strategy conviction scores are mathematical algorithmic calculations and do NOT constitute professional investment advice, financial planning, or fiduciary services under the Investment Advisers Act of 1940.
            </p>
          </div>

          {/* Section 2 */}
          <div className="pt-3 space-y-1.5">
            <h4 className="font-bold text-slate-100 text-xs">
              2. Latency, Technical Slippage &amp; Brokerage APIs
            </h4>
            <p className="text-slate-400 leading-normal">
              Orders dispatched from this terminal are transmitted through third-party brokerage APIs (Robinhood Financial LLC, Charles Schwab &amp; Co.). System availability, exchange order book depths, network latencies, and rapid market fluctuations may cause fill prices to deviate from displayed quote telemetry.
            </p>
          </div>

          {/* Section 3 */}
          <div className="pt-3 space-y-1.5">
            <h4 className="font-bold text-slate-100 text-xs">
              3. Autonomous Strategy Loops &amp; Auto-Execution
            </h4>
            <p className="text-slate-400 leading-normal">
              Enabling &quot;Auto Strategy Loop&quot; allows background workers to continuously evaluate position cost bases against user-configured target profit thresholds (+%) and stop-loss margins (-%). You acknowledge that automated execution occurs without individual per-trade manual confirmation once loop triggers are met.
            </p>
          </div>

          {/* Section 4 */}
          <div className="pt-3 space-y-1.5">
            <h4 className="font-bold text-slate-100 text-xs">
              4. Authentication &amp; Isolated Profile Binding
            </h4>
            <p className="text-slate-400 leading-normal">
              Acceptance of this agreement is cryptographically linked to your verified Google Identity session ({user?.email || 'Authenticated User'}) and stored immutably in the user profile audit database.
            </p>
          </div>
        </div>

        {/* FIXED FOOTER (ALWAYS VISIBLE ON SCREEN) */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-[#141b2d] shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 self-start sm:self-auto">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Declining invalidates your session and forces logout.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleDecline}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-rose-800/60 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Decline &amp; Logout</span>
            </button>

            <button
              type="button"
              onClick={handleAccept}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none px-5 py-2 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'Recording...' : 'Accept & Enter Terminal'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
