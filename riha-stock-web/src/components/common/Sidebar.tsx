import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTrading } from '../../context/TradingContext';
import {
  TrendingUp,
  LayoutDashboard,
  Flame,
  Star,
  Layers,
  Workflow,
  Radio,
  ChevronRight,
  ShieldCheck,
  Zap,
  Activity,
  LogOut,
  Search,
  Sparkles,
  Cpu,
} from 'lucide-react';

interface SidebarProps {
  activeTab: 'account' | 'trending' | 'watchlist' | 'strategies' | 'agent-execution' | 'audit-history';
  setActiveTab: (tab: 'account' | 'trending' | 'watchlist' | 'strategies' | 'agent-execution' | 'audit-history') => void;
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onCloseMobile,
}) => {
  const { user, logout, disclaimerAccepted } = useAuth();
  const { personalizedWatchlist, holdings, selectedProvider } = useTrading();
  const [filterQuery, setFilterQuery] = useState('');

  const handleNav = (tab: 'account' | 'trending' | 'watchlist' | 'strategies' | 'agent-execution' | 'audit-history') => {
    setActiveTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const providerLabel =
    selectedProvider === 'ROBINHOOD_STOCKS'
      ? 'Robinhood Equities'
      : selectedProvider === 'ROBINHOOD_CRYPTO'
      ? 'Robinhood Crypto (MCP)'
      : selectedProvider === 'CHARLES_SCHWAB'
      ? 'Charles Schwab'
      : 'Consolidated Ledger';

  const navGroups = [
    {
      group: 'PORTFOLIO & ASSETS',
      items: [
        {
          id: 'account' as const,
          label: 'Account & Holdings',
          description: 'Live positions, PnL & volume analytics',
          icon: <LayoutDashboard className="w-4 h-4" />,
          badge: holdings.length > 0 ? `${holdings.length} POS` : undefined,
          badgeColor: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80',
        },
        {
          id: 'audit-history' as const,
          label: 'Audit, Auto-Loops & PnL',
          description: 'Transaction ledger & background runners',
          icon: <Activity className="w-4 h-4" />,
          badge: 'LEDGER',
          badgeColor: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80',
        },
      ],
    },
    {
      group: 'MARKET DISCOVERY',
      items: [
        {
          id: 'trending' as const,
          label: 'Trending Movers',
          description: 'Real-time market momentum & DAG score',
          icon: <Flame className="w-4 h-4" />,
          badge: '5-NODE DAG',
          badgeColor: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
        },
        {
          id: 'watchlist' as const,
          label: 'Personalized Watchlist',
          description: 'High-conviction shortlisted tickers',
          icon: (
            <Star
              className={`w-4 h-4 ${
                personalizedWatchlist.length > 0 ? 'text-amber-400 fill-amber-400' : ''
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
          description: 'Multi-factor quantitative breakdown',
          icon: <Layers className="w-4 h-4" />,
          badge: 'MULTI-FACTOR',
          badgeColor: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/80',
        },
        {
          id: 'agent-execution' as const,
          label: 'Agent Execution Trace',
          description: 'Live asynchronous pipeline logs',
          icon: <Workflow className="w-4 h-4" />,
          badge: 'LIVE TRACE',
          badgeColor: 'bg-purple-950/80 text-purple-300 border-purple-800/80',
        },
      ],
    },
  ];

  const filteredGroups = navGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      item.label.toLowerCase().includes(filterQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(filterQuery.toLowerCase())
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs lg:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Main Modern Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0d121f] border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } shadow-2xl lg:shadow-none`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-slate-800/80 flex items-center justify-between bg-[#0b0f19]/70 backdrop-blur-md">
          <button
            onClick={() => handleNav('account')}
            className="flex items-center gap-3 text-left group focus:outline-none"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-600/30 group-hover:scale-105 group-hover:shadow-indigo-500/50 transition-all duration-200 ring-1 ring-white/10">
                <TrendingUp className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#0d121f] rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-tight">
                <span className="text-base font-black tracking-tight text-white group-hover:text-indigo-200 transition-colors">
                  RIHA
                </span>
                <span className="text-base font-black bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
                  STOCK
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 font-medium">
                  Admin Terminal
                </span>
              </div>
            </div>
          </button>

          <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-slate-800/90 text-slate-300 border border-slate-700/80 flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            v2.4
          </span>
        </div>

        {/* Quick Nav Filter Search */}
        <div className="px-3 pt-3 pb-1">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter menu tabs..."
              className="w-full bg-[#131a2b] border border-slate-800/90 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition-all"
            />
            {filterQuery && (
              <button
                onClick={() => setFilterQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Navigation Group Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
          {filteredGroups.map((group) => (
            <div key={group.group} className="space-y-1">
              <div className="px-3 text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase mb-1.5 flex items-center justify-between">
                <span>{group.group}</span>
              </div>
              {group.items.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNav(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 group text-left ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-600/25 via-indigo-600/10 to-transparent text-white border-l-[3px] border-indigo-500 shadow-sm'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`p-1.5 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'bg-slate-800/40 text-slate-400 group-hover:text-slate-200 group-hover:bg-slate-800/80'
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-[13px]">{item.label}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      {item.badge && (
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md border ${
                            item.badgeColor || 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform ${
                          isActive
                            ? 'text-indigo-400'
                            : 'text-slate-400 group-hover:text-slate-400 group-hover:translate-x-0.5'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Live Broker & Pipeline Status Card */}
        <div className="px-3 pt-2 pb-2 border-t border-slate-800/80">
          <div className="p-3 rounded-xl bg-[#111728] border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                Live Broker API
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/70 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                ONLINE
              </span>
            </div>

            <div className="text-[11px] font-bold text-slate-200 flex items-center justify-between">
              <span className="truncate pr-1">{providerLabel}</span>
              <span className="font-mono text-emerald-400 font-black shrink-0">99.9% SLA</span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1.5 border-t border-slate-800/80">
              <span className="flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-amber-400" />
                Threads: 15s Scans
              </span>
              {disclaimerAccepted && (
                <span className="flex items-center gap-0.5 text-emerald-400" title="SEC Disclaimer Accepted">
                  <ShieldCheck className="w-3 h-3" />
                  SEC
                </span>
              )}
            </div>
          </div>
        </div>

        {/* User Profile & Logout Bottom Strip */}
        <div className="p-3 border-t border-slate-800/80 bg-[#0b0f19]/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || 'User'}
                className="w-8 h-8 rounded-full ring-1 ring-slate-700 shrink-0 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-700 to-purple-700 flex items-center justify-center text-xs font-bold text-white ring-1 ring-slate-700 shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate">
                {user?.name || 'Administrator'}
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {user?.email || 'trader@riha.ai'}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign Out & Lock Terminal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 border border-transparent hover:border-red-900/50 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
