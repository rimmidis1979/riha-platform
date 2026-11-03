import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Zap,
  Trash2,
  X,
  ExternalLink,
} from 'lucide-react';

export interface PlatformNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  read: boolean;
  ticker?: string;
}

interface NotificationCenterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab?: (tab: 'account' | 'trending' | 'watchlist' | 'strategies' | 'agent-execution' | 'audit-history') => void;
}

export const NotificationCenterPopover: React.FC<NotificationCenterPopoverProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
}) => {
  const [notifications, setNotifications] = useState<PlatformNotification[]>([
    {
      id: 'notif-1',
      title: 'SEC Trading Disclaimer Active',
      description: 'Your profile has valid FINRA/SEC trading acknowledgments on record.',
      timestamp: 'Just now',
      type: 'SUCCESS',
      read: false,
    },
    {
      id: 'notif-2',
      title: 'Virtual Threads Mesh Synchronized',
      description: 'Top stocks scanner loop finished 15-second background evaluation cycle.',
      timestamp: '2m ago',
      type: 'INFO',
      read: false,
    },
    {
      id: 'notif-3',
      title: 'Auto-Loop Safety Guard Active',
      description: 'Autonomous trading loop mode is strictly manual per user profile configuration.',
      timestamp: '5m ago',
      type: 'INFO',
      read: true,
    },
  ]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 bg-[#162032] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-xs text-white">Notification Center</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] font-mono font-bold bg-indigo-600 text-white rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Mark Read
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60 p-1">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-mono">
            No active notifications.
          </div>
        ) : (
          notifications.map((n) => {
            const icon =
              n.type === 'SUCCESS' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : n.type === 'WARNING' ? (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              ) : n.type === 'ALERT' ? (
                <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-indigo-400 shrink-0" />
              );

            return (
              <div
                key={n.id}
                className={`p-3 rounded-xl transition-colors ${
                  n.read ? 'bg-transparent text-slate-400' : 'bg-slate-800/40 text-slate-200'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="font-semibold text-xs text-white truncate">
                        {n.title}
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {n.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                      {n.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 border-t border-slate-800 bg-[#0d121f] flex items-center justify-between text-[11px] font-mono text-slate-400">
        <button
          onClick={clearAll}
          className="text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" />
          Clear list
        </button>
        {onNavigateToTab && (
          <button
            onClick={() => {
              onNavigateToTab('audit-history');
              onClose();
            }}
            className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            <span>View Audit Ledger</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
