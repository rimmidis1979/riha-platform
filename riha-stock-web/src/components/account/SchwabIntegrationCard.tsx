import React, { useState, useEffect } from 'react';
import { StockApiClient } from '../../services/stockApiClient';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  Landmark,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';

interface SchwabIntegrationCardProps {
  onPortfolioSynced?: () => void;
}

export const SchwabIntegrationCard: React.FC<SchwabIntegrationCardProps> = ({ onPortfolioSynced }) => {
  const [clientId, setClientId] = useState<string>('XHQMsbAzLcGHBfFEf39lhayOLahbKGm1KhwjZ8mTgfNonvsz');
  const [clientSecret, setClientSecret] = useState<string>('weGTF4a8VjudICsfl15NBsmDUEqpptkIE7mC5B8wCKofzx9xaRdwGYaJ3AEPh0jf');
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [callbackUrl, setCallbackUrl] = useState<string>('https://rihasoftwaresolutions.com');
  const [authCodeInput, setAuthCodeInput] = useState<string>('');

  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [executionMode, setExecutionMode] = useState<'PAPERLESS' | 'ACTUAL'>('PAPERLESS');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [buyingPower, setBuyingPower] = useState<number>(0);
  const [totalEquity, setTotalEquity] = useState<number>(0);
  const [positionsCount, setPositionsCount] = useState<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAuthorizing, setIsAuthorizing] = useState<boolean>(false);
  const [isExchanging, setIsExchanging] = useState<boolean>(false);
  const [isModeUpdating, setIsModeUpdating] = useState<boolean>(false);
  const [copiedCallback, setCopiedCallback] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    loadSchwabStatus();
  }, []);

  const loadSchwabStatus = async () => {
    setIsLoading(true);
    try {
      const settings = await StockApiClient.getGlobalSettings();
      if (settings) {
        if (settings.schwabExecutionMode) {
          setExecutionMode(settings.schwabExecutionMode);
        }
        if (settings.schwabClientId) {
          setClientId(settings.schwabClientId);
        }
        setIsConnected(Boolean(settings.schwabConnected));
      }

      const schwabData = await StockApiClient.getSchwabPortfolio();
      if (schwabData) {
        setIsConnected(Boolean(schwabData.connected));
        setAccountNumber(schwabData.accountNumber || '');
        setCashBalance(Number(schwabData.cashBalance || 0));
        setBuyingPower(Number(schwabData.buyingPower || 0));
        setTotalEquity(Number(schwabData.totalEquity || 0));
        setPositionsCount(Array.isArray(schwabData.positions) ? schwabData.positions.length : 0);
      }
    } catch (e: any) {
      console.warn('Could not load Schwab status:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAuthUrl = async () => {
    setIsAuthorizing(true);
    setStatusMessage(null);
    try {
      const { authUrl } = await StockApiClient.getSchwabAuthUrl();
      if (authUrl) {
        window.open(authUrl, '_blank', 'noopener,noreferrer,width=800,height=700');
        setStatusMessage({
          type: 'info',
          text: 'Schwab Authorization window opened. Sign in with your Schwab credentials and approve access. If redirected, paste the authorization code below or allow the callback listener to capture it.',
        });
      }
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: e.message || 'Failed to retrieve Schwab authorization URL',
      });
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleExchangeCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authCodeInput.trim()) {
      setStatusMessage({ type: 'error', text: 'Please enter the authorization code returned by Charles Schwab.' });
      return;
    }
    setIsExchanging(true);
    setStatusMessage(null);
    try {
      await StockApiClient.exchangeSchwabAuthCode(authCodeInput.trim());
      setStatusMessage({
        type: 'success',
        text: 'Charles Schwab credentials successfully exchanged and authenticated! Live balances synced.',
      });
      setAuthCodeInput('');
      await loadSchwabStatus();
      if (onPortfolioSynced) onPortfolioSynced();
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: e.message || 'Token exchange failed. Ensure authorization code is fresh and has not expired.',
      });
    } finally {
      setIsExchanging(false);
    }
  };

  const handleToggleExecutionMode = async (newMode: 'PAPERLESS' | 'ACTUAL') => {
    setIsModeUpdating(true);
    setStatusMessage(null);
    try {
      await StockApiClient.updateBrokerMode('CHARLES_SCHWAB', newMode);
      setExecutionMode(newMode);
      setStatusMessage({
        type: 'success',
        text: `Charles Schwab execution mode updated to ${newMode === 'ACTUAL' ? 'Actual Live Trading' : 'Paperless Simulation Trading'}.`,
      });
    } catch (e: any) {
      setStatusMessage({
        type: 'error',
        text: e.message || 'Failed to update Schwab execution mode.',
      });
    } finally {
      setIsModeUpdating(false);
    }
  };

  const handleCopyCallback = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopiedCallback(true);
    setTimeout(() => setCopiedCallback(false), 2500);
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
      {/* Header with Charles Schwab Branding */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-600 flex-shrink-0">
            <Landmark className="w-6 h-6 text-sky-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Charles Schwab Brokerage Integration
              </h2>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${
                  isConnected
                    ? 'bg-sky-50 text-sky-700 border border-sky-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-sky-500 animate-pulse' : 'bg-amber-400'}`} />
                {isConnected ? 'Schwab Linked' : 'OAuth Pending'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Equities, Options, & Real-Time Callback Stream via Charles Schwab Developer Trader API
            </p>
          </div>
        </div>

        {/* Global Broker Execution Mode Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-600 px-2 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-slate-500" />
            Schwab Mode:
          </span>
          <button
            onClick={() => handleToggleExecutionMode('PAPERLESS')}
            disabled={isModeUpdating}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              executionMode === 'PAPERLESS'
                ? 'bg-white text-indigo-700 shadow-xs border border-indigo-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Paperless Trading
          </button>
          <button
            onClick={() => handleToggleExecutionMode('ACTUAL')}
            disabled={isModeUpdating}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              executionMode === 'ACTUAL'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Actual Trading
          </button>
        </div>
      </div>

      {/* Telemetry ribbon when connected */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Account #</span>
          <span className="text-xs font-mono font-bold text-slate-800">{accountNumber || 'SCHWAB-PRIME'}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Cash Balance</span>
          <span className="text-xs font-mono font-bold text-slate-900">${cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Buying Power</span>
          <span className="text-xs font-mono font-bold text-sky-700">${buyingPower.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
        <div>
          <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block">Active Holdings</span>
          <span className="text-xs font-mono font-bold text-slate-900">{positionsCount} Stocks</span>
        </div>
      </div>

      {/* Credentials and OAuth configuration */}
      <div className="space-y-4 pt-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Client ID (App Key)
            </label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Client Secret</span>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-[11px] font-normal"
              >
                {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {showSecret ? 'Hide' : 'Show'}
              </button>
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Callback URL helper */}
        <div className="p-3 rounded-xl bg-sky-50/50 border border-sky-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-sky-600 flex-shrink-0 animate-pulse" />
            <div>
              <span className="text-xs font-bold text-sky-900">Registered Callback URL:</span>
              <span className="text-xs font-mono text-sky-800 ml-1.5 select-all">{callbackUrl}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyCallback}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs font-semibold transition-all self-end sm:self-auto"
          >
            {copiedCallback ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCallback ? 'Copied' : 'Copy Callback'}</span>
          </button>
        </div>

        {/* OAuth Action Buttons & Code Exchange */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleOpenAuthUrl}
            disabled={isAuthorizing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-500/20 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            <span>{isAuthorizing ? 'Opening Schwab...' : 'Authorize with Charles Schwab'}</span>
          </button>

          <button
            type="button"
            onClick={loadSchwabStatus}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Balances</span>
          </button>
        </div>

        {/* Manual Code Input Form */}
        <form onSubmit={handleExchangeCode} className="pt-2 flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            placeholder="Paste Charles Schwab authorization code here if redirected..."
            value={authCodeInput}
            onChange={(e) => setAuthCodeInput(e.target.value)}
            className="w-full sm:flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <button
            type="submit"
            disabled={isExchanging || !authCodeInput.trim()}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center justify-center gap-2"
          >
            {isExchanging ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            <span>Exchange Code</span>
          </button>
        </form>

        {/* Status Alert */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl flex items-center gap-2.5 text-xs font-medium border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-sky-50 text-sky-800 border-sky-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            ) : (
              <Radio className="w-4 h-4 text-sky-600 flex-shrink-0" />
            )}
            <p className="flex-1 leading-relaxed">{statusMessage.text}</p>
          </div>
        )}
      </div>
    </div>
  );
};
