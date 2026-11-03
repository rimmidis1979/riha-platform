import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, X, RefreshCw } from 'lucide-react';

interface DestructiveConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmKeyword?: string;
  confirmButtonText?: string;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
  isProcessing?: boolean;
}

export const DestructiveConfirmModal: React.FC<DestructiveConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmKeyword,
  confirmButtonText = 'Confirm Destructive Action',
  onConfirm,
  onClose,
  isProcessing = false,
}) => {
  const [typedKeyword, setTypedKeyword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const requiresTyping = Boolean(confirmKeyword);
  const isMatch = !requiresTyping || typedKeyword.trim().toUpperCase() === confirmKeyword?.toUpperCase();

  const handleConfirm = async () => {
    if (!isMatch) {
      setError(`Please type "${confirmKeyword}" to confirm.`);
      return;
    }
    setError(null);
    await onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-[#0f172a] rounded-2xl border border-rose-900/60 shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-rose-950 bg-rose-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-900/40 border border-rose-700/60 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono">{title}</h3>
              <p className="text-[11px] text-rose-400/90 font-mono">Mission-Critical Confirmation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-xs text-slate-300 leading-relaxed font-sans">{description}</p>

          {requiresTyping && (
            <div className="space-y-2">
              <label className="block text-xs font-mono text-slate-400">
                Type <strong className="text-rose-400 font-bold">{confirmKeyword}</strong> below to confirm:
              </label>
              <input
                type="text"
                value={typedKeyword}
                onChange={(e) => {
                  setTypedKeyword(e.target.value);
                  setError(null);
                }}
                placeholder={confirmKeyword}
                className="w-full px-3 py-2 bg-[#0b0f19] border border-rose-900/80 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-rose-500"
              />
            </div>
          )}

          {error && <div className="text-xs text-rose-400 font-mono">{error}</div>}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isMatch || isProcessing}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 border border-rose-500 shadow-md shadow-rose-900/40 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isProcessing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{confirmButtonText}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

