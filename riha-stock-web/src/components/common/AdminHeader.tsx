import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTrading, MarketProviderType } from '../../context/TradingContext';
import {
  Menu,
  Search,
  LogOut,
  Radio,
  ShieldCheck,
  ChevronDown,
  Check,
  TrendingUp,
  Zap,
  Landmark,
  Layers,
} from 'lucide-react';

interface AdminHeaderProps {
  activeTab: 'account' | 'trending' | 'watchlist' | 'strategies' | 'agent-execution' | 'audit-history';
  onToggleSidebar: () => void;
  onQuickSearchTicker?: (ticker: string) => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  activeTab,
  onToggleSidebar,
  onQuickSearchTicker,
}) => {
  const { user, logout } = useAuth();
  const { selectedProvider, setSelectedProvider } = useTrading();
  const [tickerQuery, setTickerQuery] = useState('');
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isGoogleUser = user?.avatar?.includes('google') || user?.email?.includes('gmail');

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsProviderDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const providerConfigs: {
    id: MarketProviderType;
    label: string;
    sublabel: string;
    badge: string;
    icon: React.ReactNode;
    colorClasses: string;
  }[] = [
    {
      id: 'ROBINHOOD_STOCKS',
      label: 'Robinhood Live API',
      sublabel: 'Equities, Direct Orders & Live Holdings',
      badge: 'LIVE REST',
      icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />,
      colorClasses: 'border-emerald-800/80 bg-emerald-950/70 text-emerald-300',
    },
    {
      id: 'ROBINHOOD_CRYPTO',
      label: 'Robinhood Crypto (MCP)',
      sublabel: 'Model Context Protocol Server Feeds',
      badge: 'MCP SERVER',
      icon: <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-500" />,
      colorClasses: 'border-emerald-800/80 bg-emerald-950/70 text-emerald-300',
    },
    {
      id: 'CHARLES_SCHWAB',
      label: 'Charles Schwab API',
      sublabel: 'Trader OAuth 2.0 Margin & Equities',
      badge: 'SCHWAB API',
      icon: <Landmark className="w-3.5 h-3.5 text-sky-400" />,
      colorClasses: 'border-sky-800/80 bg-sky-950/70 text-sky-300',
    },
    {
      id: 'CONSOLIDATED',
      label: 'Consolidated Portfolio',
      sublabel: 'Unified Ledger across All Active Brokers',
      badge: 'MULTI-BROKER',
      icon: <Layers className="w-3.5 h-3.5 text-indigo-400" />,
      colorClasses: 'border-indigo-800/80 bg-indigo-950/70 text-indigo-300',
    },
  ];

  const currentProvider =
    providerConfigs.find((p) => p.id === selectedProvider) || providerConfigs[0];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = tickerQuery.trim().toUpperCase();
    if (!clean) return;
    if (onQuickSearchTicker) {
      onQuickSearchTicker(clean);
      setTickerQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#0d121f]/95 backdrop-blur-md border-b border-slate-800/90 px-4 sm:px-6 flex items-center justify-between gap-4">
      {/* Left: Mobile Toggle & Stock Market Provider Dropdown */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors lg:hidden"
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Stock Market Provider Selection Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsProviderDropdownOpen(!isProviderDropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#141b2d] border border-slate-700/80 hover:border-indigo-500/80 text-xs text-slate-200 transition-all font-mono shadow-xs group"
            title="Switch Stock Market Provider (Robinhood API, Robinhood MCP, or Charles Schwab)"
          >
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="p-1 rounded-md bg-slate-800/80 border border-slate-700">
                {currentProvider.icon}
              </span>
            </div>

            <div className="text-left hidden sm:block">
              <div className="font-bold text-[11px] text-white leading-tight">
                {currentProvider.label}
              </div>
              <div className="text-[9px] text-slate-400 font-sans">
                Market Provider
              </div>
            </div>

            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                isProviderDropdownOpen ? 'rotate-180 text-indigo-400' : 'group-hover:text-slate-200'
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isProviderDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[#111827] border border-slate-700 shadow-2xl p-2 z-50 space-y-1">
              <div className="px-3 py-2 border-b border-slate-800 text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center justify-between">
                <span>Select Market Provider</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                  ACTIVE FEEDS
                </span>
              </div>

              {providerConfigs.map((prov) => {
                const isSelected = prov.id === selectedProvider;
                return (
                  <button
                    key={prov.id}
                    onClick={() => {
                      setSelectedProvider(prov.id);
                      setIsProviderDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all font-mono text-xs ${
                      isSelected
                        ? 'bg-indigo-600/20 text-white border border-indigo-500/50'
                        : 'text-slate-300 hover:bg-slate-800/70 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="p-1.5 rounded-lg bg-slate-800 border border-slate-700">
                        {prov.icon}
                      </span>
                      <div>
                        <div className="font-bold text-xs text-white leading-tight flex items-center gap-1.5">
                          <span>{prov.label}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-sans font-bold border ${prov.colorClasses}`}
                          >
                            {prov.badge}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans mt-0.5">
                          {prov.sublabel}
                        </div>
                      </div>
                    </div>

                    {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Center: Command / Ticker Quick Search (Desktop) */}
      <div className="hidden xl:flex items-center">
        <form onSubmit={handleSearchSubmit} className="relative w-64 xl:w-72">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={tickerQuery}
            onChange={(e) => setTickerQuery(e.target.value)}
            placeholder="Search ticker (e.g. SMX, AAPL)..."
            className="w-full pl-9 pr-12 py-1.5 bg-[#141b2d] border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            ↵
          </kbd>
        </form>
      </div>

      {/* Right: Telemetry Pill & User Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* User Monogram & Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="relative">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/30"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-900 to-slate-800 border border-indigo-700/60 flex items-center justify-center font-bold text-xs text-indigo-300">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}

            {isGoogleUser && (
              <div
                title="Authenticated via Google OAuth 2.0"
                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#111827] flex items-center justify-center p-0.5 border border-slate-700"
              >
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              </div>
            )}
          </div>

          <div className="hidden sm:block text-left leading-tight">
            <div className="text-xs font-bold text-slate-200">
              {user?.name || 'Trader'}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {user?.accountNumber || 'RH-Live'}
            </div>
          </div>

          <button
            onClick={logout}
            title="Sign Out"
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-800/60 transition-all ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
