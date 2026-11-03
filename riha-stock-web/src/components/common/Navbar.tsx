import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTrading } from '../../context/TradingContext';
import {
  TrendingUp,
  User as UserIcon,
  Star,
  LogOut,
  Flame,
  Layers,
  Workflow,
  Sparkles,
  Menu,
  X,
  Radio,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'account' | 'trending' | 'watchlist' | 'strategies' | 'agent-execution';
  setActiveTab: (tab: 'account' | 'trending' | 'watchlist' | 'strategies' | 'agent-execution') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const { personalizedWatchlist } = useTrading();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isGoogleUser = user?.avatar?.includes('google') || user?.email?.includes('gmail');

  const navItems: {
    id: 'account' | 'trending' | 'strategies' | 'agent-execution' | 'watchlist';
    label: string;
    icon: React.ReactNode;
    badge?: React.ReactNode;
  }[] = [
      {
        id: 'account',
        label: 'My Account',
        icon: <UserIcon className="w-4 h-4" />,
      },
      {
        id: 'trending',
        label: 'Trending Stocks',
        icon: <Flame className="w-4 h-4 text-amber-500" />,
      },
      {
        id: 'strategies',
        label: 'Strategy Diagnostics',
        icon: <Layers className="w-4 h-4 text-indigo-500" />,
        badge: (
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100/80 text-blue-700 tracking-wide">
            AI
          </span>
        ),
      },
      {
        id: 'agent-execution',
        label: 'Agent Execution',
        icon: <Workflow className="w-4 h-4 text-purple-500" />,
        badge: (
          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-purple-100/80 text-purple-700 tracking-wide">
            Trace
          </span>
        ),
      },
      {
        id: 'watchlist',
        label: 'Personalized Watchlist',
        icon: (
          <Star
            className={`w-4 h-4 ${personalizedWatchlist.length > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-400'
              }`}
          />
        ),
        badge:
          personalizedWatchlist.length > 0 ? (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
              {personalizedWatchlist.length}
            </span>
          ) : undefined,
      },
    ];

  const handleTabClick = (id: 'account' | 'trending' | 'watchlist' | 'strategies' | 'agent-execution') => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Live Status */}
          <div className="flex items-center gap-6">
            <div
              onClick={() => handleTabClick('account')}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-all">
                <TrendingUp className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5 leading-tight">
                  <span className="text-base font-black tracking-tight text-slate-900">
                    RIHA
                  </span>
                  <span className="text-base font-black bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Stock
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-slate-600">
                    Robinhood Live
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden xl:flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/70 shadow-inner">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleTabClick(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                    {item.badge}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Medium Screen Nav (Icon-first compact) */}
          <nav className="hidden md:flex xl:hidden items-center gap-1 p-1 bg-slate-100/80 rounded-xl border border-slate-200/70">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  title={item.label}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                    }`}
                >
                  {item.icon}
                  <span className="hidden lg:inline">{item.label}</span>
                  {item.badge}
                </button>
              );
            })}
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            {/* Live Terminal Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono font-bold">
              <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
              <span>API Active</span>
            </div>

            {/* Profile Avatar & Info */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <div className="relative">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/20"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-100 to-indigo-100 border border-blue-200 flex items-center justify-center font-black text-xs text-blue-700">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                )}

                {isGoogleUser && (
                  <div
                    title="Authenticated via Google OAuth 2.0"
                    className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center shadow-xs p-0.5 border border-slate-200"
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

              <div className="hidden sm:block text-left leading-none">
                <div className="text-xs font-bold text-slate-800">
                  {user?.name || 'Trader'}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {user?.accountNumber || 'RH-Live'}
                </div>
              </div>

              <button
                onClick={logout}
                title="Sign Out"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-200/80 space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
