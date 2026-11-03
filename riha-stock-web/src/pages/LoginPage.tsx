import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { StockApiClient } from '../services/stockApiClient';
import {
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Cpu,
  Lock,
  Workflow,
  Radio,
  FileText,
  Activity,
  CheckCircle2,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, isLoading, error } = useAuth();
  const [localError, setLocalError] = useState<string | null>(null);
  const [googleClientReady, setGoogleClientReady] = useState(false);
  const gsiInitializedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const initGoogleGsi = async () => {
      try {
        const clientId = await StockApiClient.getGoogleClientId();
        if (!isMounted) return;

        const renderGoogleAuth = () => {
          const google = (window as any).google;
          if (google?.accounts?.id && !gsiInitializedRef.current) {
            gsiInitializedRef.current = true;
            google.accounts.id.initialize({
              client_id: clientId,
              callback: async (response: any) => {
                if (response?.credential) {
                  setLocalError(null);
                  await loginWithGoogle(response.credential);
                }
              },
              auto_select: false,
              cancel_on_tap_outside: true,
            });

            const btnContainer = document.getElementById('google-btn-rendered');
            if (btnContainer && google.accounts.id.renderButton) {
              btnContainer.innerHTML = '';
              google.accounts.id.renderButton(btnContainer, {
                theme: 'filled_black',
                size: 'large',
                width: 360,
                text: 'continue_with',
                shape: 'pill',
                logo_alignment: 'left',
              });
            }
            if (isMounted) setGoogleClientReady(true);
          }
        };

        if ((window as any).google?.accounts?.id) {
          renderGoogleAuth();
        } else {
          const timer = setInterval(() => {
            if ((window as any).google?.accounts?.id) {
              clearInterval(timer);
              renderGoogleAuth();
            }
          }, 250);
          setTimeout(() => clearInterval(timer), 6000);
        }
      } catch (err) {
        console.warn('Google GSI initialization notice:', err);
      }
    };

    initGoogleGsi();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleGoogleClick = async () => {
    setLocalError(null);
    try {
      const clientId = await StockApiClient.getGoogleClientId();
      const google = (window as any).google;

      // 1. Prefer TokenClient: directly receives access_token and queries Google userinfo for real profile data
      if (google?.accounts?.oauth2?.initTokenClient) {
        const tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.access_token) {
              try {
                const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                });
                if (userinfoRes.ok) {
                  const profile = await userinfoRes.json();
                  await loginWithGoogle(tokenResponse.access_token, {
                    id: profile.sub,
                    email: profile.email,
                    name: profile.name,
                    picture: profile.picture,
                  });
                  return;
                }
              } catch (uErr) {
                console.warn('Google userinfo fetch notice:', uErr);
              }
              await loginWithGoogle(tokenResponse.access_token);
            } else if (tokenResponse?.error) {
              setLocalError(`Google Sign-In canceled: ${tokenResponse.error}`);
            }
          },
        });
        tokenClient.requestAccessToken();
        return;
      }

      // 2. Fallback to initCodeClient if token client unavailable
      if (google?.accounts?.oauth2?.initCodeClient) {
        const client = google.accounts.oauth2.initCodeClient({
          client_id: clientId,
          scope: 'openid email profile',
          ux_mode: 'popup',
          callback: async (response: any) => {
            if (response?.code) {
              await loginWithGoogle(response.code);
            } else if (response?.error) {
              setLocalError(`Google Sign-In canceled or failed: ${response.error}`);
            }
          },
        });
        client.requestCode();
        return;
      }

      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google click error:', err);
      setLocalError(err.message || 'Google authentication error');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Ambient background glows for rich dark mode depth */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[250px] bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container with generous spacing */}
      <div className="max-w-xl w-full mx-auto space-y-8 relative z-10">
        {/* PLATFORM BRANDING */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 shadow-xl shadow-indigo-600/20 mb-2">
            <TrendingUp className="w-8 h-8" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-indigo-950/80 text-indigo-400 border border-indigo-800/80 uppercase tracking-wider">
              Institutional Terminal
            </span>
            <span className="px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 uppercase tracking-wider">
              Zero-Mock Data
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            RIHA <span className="text-indigo-400">Stock AI</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Real-Time Autonomous Algorithmic Trading Platform with Position-Gated Execution and SEC Regulatory Ledger.
          </p>
        </div>

        {/* MAIN DARK MODE LOGIN CARD */}
        <div className="bg-[#111827] border border-slate-800 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6">
          <div className="text-center space-y-1.5 pb-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Enterprise Trader Sign In</h2>
            <p className="text-xs text-slate-400">
              Authentication is strictly managed via Google Identity Services &amp; OAuth 2.0.
            </p>
          </div>

          {(error || localError) && (
            <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error || localError}</span>
            </div>
          )}

          {/* PRIMARY GOOGLE SINGLE SIGN-ON ACTION */}
          <div className="space-y-4 pt-1">
            {/* Native Google Identity Services Button Container */}
            <div id="google-btn-rendered" className="w-full flex justify-center min-h-[44px]" />

            {/* Styled Enterprise Google OAuth Button */}
            <button
              type="button"
              onClick={handleGoogleClick}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3.5 py-3.5 px-6 rounded-2xl bg-[#161d2d] hover:bg-[#1f293d] border border-slate-700 hover:border-indigo-500/80 text-white font-bold text-sm shadow-xl shadow-black/40 transition-all duration-200 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
              <span>Continue with Google Sign-In</span>
            </button>
          </div>

          {/* SECURITY & COMPLIANCE CALLOUT */}
          <div className="p-4 rounded-2xl bg-[#0b0f19] border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Strict Google SSO Authentication Policy</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              In accordance with US institutional financial controls and SOC 2 guidelines, only authenticated Google profiles are permitted. Traditional passwords and demo logins have been decommissioned.
            </p>
          </div>

          {/* SPATIOUS PLATFORM CAPABILITIES SUMMARY */}
          <div className="pt-4 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>5-Node Agentic DAG</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Live Robinhood API Sync</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Autonomous Strategy Loops</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>SEC EDGAR Filings Feed</span>
            </div>
          </div>

          {/* CARD FOOTER */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5 text-slate-400 font-mono">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              TLS 1.3 / OAuth 2.0 Encrypted
            </span>
            <span className="font-mono">RIHA v1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
