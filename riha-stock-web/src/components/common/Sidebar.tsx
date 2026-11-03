import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTrading } from '../../context/TradingContext';
import {
  TrendingUp,
  LayoutDashboard,
  Briefcase,
  Flame,
  Star,
  Layers,
  Workflow,
  Radio,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'account' | 'trending' | 'watchlist' | 'strategies' | 'agent-execution';
  setActiveTab: (tab: 'account' | 'trending' | 'watchlist' | 'strategies' | 'agent-execution') => void;
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onCloseMobile,
}) => {
  const { user } = useAuth();
  const { personalizedWatchlist, holdings } = useTrading();

  const handleNav = (tab: 'account' | 'trending' | 'watchlist' | 'strategies' | 'agent-execution') => {
    setActiveTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const navGroups = [
    {
      group: 'PORTFOLIO & ASSETS',
      items: [
        {
          id: 'account' as const,
          label: 'Account & Holdings',
          icon: <LayoutDashboard className="w-4 h-4" />,
          badge: holdings.length > 0 ? `${holdings.length} POS` : undefined,
          badgeColor: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80',
        },
      ],
    },
    {
      group: 'MARKET DISCOVERY',
      items: [
        {
          id: 'trending' as const,
          label: 'Trending Movers',
          icon: <Flame className="w-4 h-4 text-amber-400" />,
          badge: '5-NODE DAG',
          badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
        },
        {
          id: 'watchlist' as const,
          label: 'Personalized Watchlist',
          icon: (
            <Star
              className={`w-4 h-4 ${
                personalizedWatchlist.length > 0 ? 'text-amber-400 fill-amber-400' : 'text-slate-500'
              }`}
            />
          ),
          badge: personalizedWatchlist.length > 0 ? String(personalizedWatchlist.length) : undefined,
          badgeColor: 'bg-blue-950/80 text-blue-300 border-blue-800/80',
        },
      ],
    },
    {
      group: 'AI ORCHESTRATION',
      items: [
        {
          id: 'strategies' as const,
          label: 'Strategy Diagnostics',
          icon: <Layers className="w-4 h-4 text-indigo-400" />,
          badge: 'MULTI-FACTOR',
          badgeColor: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80',
        },
        {
          id: 'agent-execution' as const,
          label: 'Agent Execution Trace',
          icon: <Workflow className="w-4 h-4 text-purple-400" />,
          badge: 'LIVE TRACE',
          badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-800/80',
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#111827] border-r border-slate-800/90 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 border-b border-slate-800/90 flex items-center justify-between">
          <div
            onClick={() => handleNav('account')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 transition-all">
              <TrendingUp className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-tight">
                <span className="text-base font-black tracking-tight text-white">RIHA</span>
                <span className="text-base font-black bg-gradient-to-r from-indigo-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
                  STOCK
                </span>
              </div>
              <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 block">
                Admin Terminal
              </span>
            </div>
          </div>

          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
            v2.4
          </span>
        </div>

        {/* Grouped Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          {navGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              <div className="px-3 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase mb-2">
                {group.group}
              </div>
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-indigo-600/20 text-white border-l-2 border-indigo-500 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`transition-colors ${
                          isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                          item.badgeColor || 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Live Broker & Pipeline Status Card */}
        <div className="p-3 border-t border-slate-800/90">
          <div className="p-3.5 rounded-xl bg-[#0c1220] border border-slate-800 text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                Live Broker API
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/70 font-bold">
                CONNECTED
              </span>
            </div>

            <div className="text-[11px] font-bold text-slate-200 flex items-center justify-between">
              <span>Robinhood Live</span>
              <span className="font-mono text-emerald-400 font-black">99.9% SLA</span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/80">
              <span className="flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-amber-400" />
                Virtual Threads:
              </span>
              <span className="text-slate-300">15s Scans</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
