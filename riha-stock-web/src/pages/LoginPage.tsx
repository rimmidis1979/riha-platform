import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DEMO_USERS } from '../services/mockData';
import {
  TrendingUp,
  ShieldCheck,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  Zap,
  CheckCircle,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, simulateGoogleCallback, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email) {
      setError('Please provide an email address.');
      return;
    }
    await login(email, password);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background radial gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-teal-500/10 blur-[110px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* Brand Icon */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/25 mx-auto mb-4">
          <TrendingUp className="w-8 h-8 text-white stroke-[2.5]" />
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
          RIHA <span className="text-emerald-400">STOCK</span>
        </h1>
        <p className="mt-1 text-xs font-mono uppercase tracking-wider text-zinc-400">
          Personalized Real-Time Stock Trading Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="onyx-card rounded-3xl p-8 border border-zinc-800 shadow-2xl backdrop-blur-2xl">
          {/* Section: Primary Google Authentication */}
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-bold text-white">Welcome Back</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Authenticate with your Google account to access your portfolio</p>
            </div>

            {/* Google Authentication Button */}
            <button
              onClick={loginWithGoogle}
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-900 font-semibold text-sm flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all active:scale-[0.99] border border-zinc-200"
            >
              {/* Official Google G Logo */}
              <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0">
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
              <span>Continue with Google</span>
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-mono">
                <span className="bg-zinc-900 px-3 text-zinc-500">Or use email credentials</span>
              </div>
            </div>

            {/* Standard Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-zinc-400 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="trader@rihasoftwaresolutions.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-mono uppercase text-zinc-400">Password</label>
                  <a href="#reset" className="text-[11px] text-emerald-400 hover:underline font-mono">
                    Forgot?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-sm tracking-wide transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <span>Sign In to Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Quick Demo Switcher */}
            <div className="pt-4 border-t border-zinc-800/80">
              <span className="block text-[10px] uppercase font-mono text-zinc-500 text-center mb-2.5">
                Quick 1-Click Trader Profiles
              </span>
              <div className="grid grid-cols-1 gap-2">
                {DEMO_USERS.map((demo) => (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => {
                      setEmail(demo.email);
                      setPassword('demo2026!');
                      login(demo.email);
                    }}
                    className="p-2.5 rounded-xl bg-zinc-950/70 hover:bg-zinc-800/80 border border-zinc-800/80 hover:border-emerald-500/40 text-left transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                        <span>{demo.name}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                          {demo.tier}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-zinc-500">{demo.email}</div>
                    </div>
                    <div className="text-right font-mono text-xs text-emerald-400 font-bold">
                      ${(demo.portfolioValue / 1000).toFixed(1)}k
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Security Footer */}
        <div className="mt-6 flex items-center justify-center gap-4 text-xs font-mono text-zinc-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            256-Bit TLS Security
          </span>
          <span>•</span>
          <span>Google OAuth 2.0</span>
          <span>•</span>
          <span>riha-auth-service</span>
        </div>
      </div>
    </div>
  );
};
