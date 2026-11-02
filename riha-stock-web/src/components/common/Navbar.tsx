import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTrading } from '../../context/TradingContext';
import {
  TrendingUp,
  Briefcase,
  Star,
  LogOut,
  Wallet,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'account' | 'trending' | 'watchlist';
  setActiveTab: (tab: 'account' | 'trending' | 'watchlist') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const { portfolioSummary, personalizedWatchlist } = useTrading();

  const isGoogleUser = user?.id.startsWith('google') || user?.email.includes('gmail') || user?.accountNumber.startsWith('GOOG');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
      {/* Real-time mini market ticker header */}
      <div className="hidden lg:flex items-center justify-between px-6 py-1.5 bg-zinc-900/60 border-b border-zinc-800/50 text-[11px] font-mono text-zinc-400">
        <div className="flex items-center gap-6 overflow-x-auto">
          <span className="flex items-center gap-1.5 font-semibold text-zinc-300">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            NYSE / NASDAQ REAL-TIME STREAM
          </span>
          <span className="flex items-center gap-1">
            SPY <strong className="text-emerald-400 font-medium">584.20 (+0.42%)</strong>
          </span>
          <span className="flex items-center gap-1">
            QQQ <strong className="text-emerald-400 font-medium">498.60 (+0.81%)</strong>
          </span>
          <span className="flex items-center gap-1">
            NVDA <strong className="text-emerald-400 font-medium">139.80 (+2.04%)</strong>
          </span>
          <span className="flex items-center gap-1">
            PLTR <strong className="text-emerald-400 font-medium">42.15 (+4.07%)</strong>
          </span>
          <span className="flex items-center gap-1">
            TSLA <strong className="text-rose-400 font-medium">262.50 (-1.43%)</strong>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-zinc-500">Service Connect Mesh:</span>
          <span className="text-emerald-400 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> riha.internal:8080 (Active)
          </span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-8">
            <div
              onClick={() => setActiveTab('account')}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  RIHA <span className="text-emerald-400 font-black">STOCK</span>
                </span>
                <span className="block text-[10px] uppercase font-mono tracking-wider text-zinc-500">
                  Personalized Trading Terminal
                </span>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1.5 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800">
              <button
                onClick={() => setActiveTab('account')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'account'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span>My Account</span>
                <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-zinc-700/60 font-mono text-zinc-300">
                  ${(portfolioSummary.totalPortfolioValue / 1000).toFixed(1)}k
                </span>
              </button>

              <button
                onClick={() => setActiveTab('trending')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'trending'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <span>Trending Stocks</span>
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
              </button>

              <button
                onClick={() => setActiveTab('watchlist')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'watchlist'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Personalized Watchlist</span>
                <span className="ml-0.5 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                  {personalizedWatchlist.length}
                </span>
              </button>
            </nav>
          </div>

          {/* User Account & Cash Balance */}
          <div className="flex items-center gap-4">
            {/* Cash & Buying Power Badge */}
            <div className="hidden sm:flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-[10px] uppercase font-mono text-zinc-500 leading-none">Buying Power</div>
                <div className="text-xs font-mono font-bold text-zinc-200 mt-0.5">
                  ${(user?.cashBalance ?? 42850.75).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>

            {/* Profile Dropdown / Google Account Info */}
            <div className="flex items-center gap-3 pl-2 border-l border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-9 h-9 rounded-full object-cover ring-2 ring-emerald-500/40"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center font-bold text-sm text-zinc-200 border border-zinc-700">
                      {user?.name.charAt(0) || 'U'}
                    </div>
                  )}

                  {/* Google Authenticated Badge */}
                  {isGoogleUser && (
                    <div
                      title="Authenticated via Google OAuth 2.0"
                      className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-md p-0.5"
                    >
                      <svg viewBox="0 0 24 24" className="w-3 h-3">
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

                <div className="hidden sm:block text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white leading-tight">{user?.name}</span>
                    {isGoogleUser && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950/80 text-sky-400 border border-sky-800/60 font-mono">
                        Google
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 block">{user?.email}</span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                title="Sign out of trading account"
                className="p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-zinc-800/60 text-xs">
          <button
            onClick={() => setActiveTab('account')}
            className={`py-1 px-3 rounded-lg ${activeTab === 'account' ? 'bg-zinc-800 text-emerald-400 font-bold' : 'text-zinc-400'}`}
          >
            My Account
          </button>
          <button
            onClick={() => setActiveTab('trending')}
            className={`py-1 px-3 rounded-lg ${activeTab === 'trending' ? 'bg-zinc-800 text-sky-400 font-bold' : 'text-zinc-400'}`}
          >
            Trending Stocks
          </button>
          <button
            onClick={() => setActiveTab('watchlist')}
            className={`py-1 px-3 rounded-lg ${activeTab === 'watchlist' ? 'bg-zinc-800 text-amber-400 font-bold' : 'text-zinc-400'}`}
          >
            Watchlist ({personalizedWatchlist.length})
          </button>
        </div>
      </div>
    </header>
  );
};
