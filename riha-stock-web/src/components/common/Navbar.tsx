import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTrading } from '../../context/TradingContext';
import {
  TrendingUp,
  User as UserIcon,
  Star,
  LogOut,
  Flame,
} from 'lucide-react';

interface NavbarProps {
  activeTab: 'account' | 'trending' | 'watchlist';
  setActiveTab: (tab: 'account' | 'trending' | 'watchlist') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, logout } = useAuth();
  const { personalizedWatchlist } = useTrading();

  const isGoogleUser = user?.avatar?.includes('google') || user?.email?.includes('gmail');

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Clean Tabs */}
          <div className="flex items-center gap-8">
            <div
              onClick={() => setActiveTab('account')}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:bg-blue-700 transition-colors">
                <TrendingUp className="w-5 h-5 text-white stroke-[2.5]" />
              </div>
              <div>
                <span className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-1">
                  RIHA <span className="text-blue-600 font-extrabold">Stock</span>
                </span>
                <span className="block text-[10px] uppercase font-mono tracking-wider text-slate-500">
                  Trading Terminal
                </span>
              </div>
            </div>

            {/* Navigation Tabs - Clean, no portfolio value */}
            <nav className="hidden md:flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
              <button
                onClick={() => setActiveTab('account')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'account'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span>My Account</span>
              </button>

              <button
                onClick={() => setActiveTab('trending')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'trending'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Trending Stocks</span>
              </button>

              <button
                onClick={() => setActiveTab('watchlist')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'watchlist'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Star className={`w-4 h-4 ${personalizedWatchlist.length > 0 ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                <span>Personalized Watchlist</span>
                {personalizedWatchlist.length > 0 && (
                  <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono font-bold">
                    {personalizedWatchlist.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* User Profile & Logout - Buying power removed */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/30"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-sm text-blue-700">
                    {user?.name?.charAt(0) || 'U'}
                  </div>
                )}

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
                <div className="text-sm font-semibold text-slate-800 leading-tight">
                  {user?.name || 'Trader'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  {user?.accountNumber || 'RH-001'}
                </div>
              </div>

              <button
                onClick={logout}
                title="Sign Out"
                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
