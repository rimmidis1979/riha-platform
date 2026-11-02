import React from 'react';
import { useTrading } from '../../context/TradingContext';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export const ToastNotification: React.FC = () => {
  const { toasts, dismissToast } = useTrading();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border bg-white shadow-xl transition-all duration-300 animate-in slide-in-from-bottom-5 ${
              isSuccess
                ? 'border-emerald-300 text-slate-900'
                : isError
                ? 'border-rose-300 text-slate-900'
                : 'border-blue-300 text-slate-900'
            }`}
          >
            <div className="mt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {isError && <AlertTriangle className="w-5 h-5 text-rose-600" />}
              {!isSuccess && !isError && <Info className="w-5 h-5 text-blue-600" />}
            </div>

            <div className="flex-1 pr-2">
              <h4 className="text-sm font-bold tracking-tight text-slate-900">{toast.title}</h4>
              <p className="text-xs mt-0.5 text-slate-600 leading-snug">{toast.message}</p>
            </div>

            <button
              onClick={() => dismissToast(toast.id)}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
