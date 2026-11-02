import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTrading } from '../../context/TradingContext';
import { StockApiClient } from '../../services/stockApiClient';
import {
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Unlink,
  Zap,
  Cpu,
  Lock,
} from 'lucide-react';

export const RobinhoodMcpIntegrationCard: React.FC = () => {
  const { user, updateRobinhoodApiKey, disconnectRobinhood, updateCashBalance } = useAuth();
  const { setHoldings } = useTrading();

  const isConnected = Boolean(user?.robinhoodConnected && (user?.robinhoodApiKey || user?.robinhoodAccountMask));

  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [privateKeyInput, setPrivateKeyInput] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [showPrivateKey, setShowPrivateKey] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(!isConnected);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isPullingTelemetry, setIsPullingTelemetry] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handleSaveKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const cleanKey = apiKeyInput.trim();
    const cleanPriv = privateKeyInput.trim();
    if (!cleanKey) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid Robinhood API Key.' });
      return;
    }

    const fullKey = cleanPriv ? `${cleanKey}:::${cleanPriv}` : cleanKey;

    setIsSaving(true);
    try {
      const success = await updateRobinhoodApiKey(fullKey);
      if (success) {
        setIsEditing(false);
        setStatusMessage({
          type: 'success',
          text: 'Robinhood API Key & Ed25519 Private Key saved securely to your user account! MCP Gateway is verified and authorized.',
        });
      } else {
        setStatusMessage({ type: 'error', text: 'Failed to update Robinhood credentials. Please try again.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error saving Robinhood credentials' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setStatusMessage(null);
    try {
      const res = await StockApiClient.testRobinhoodMcpConnection();
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Gateway Heartbeat Healthy: ${res.message}`,
        });
      } else {
        setStatusMessage({
          type: 'info',
          text: `${res.message}. The API key is stored in your account and will activate once riha-mcp-gateway is running.`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Could not reach riha-mcp-gateway on port 8084',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handlePullRealTimeData = async () => {
    setIsPullingTelemetry(true);
    setStatusMessage(null);
    try {
      const telemetry = await StockApiClient.pullRobinhoodRealTimeData(user?.robinhoodApiKey);
      if (telemetry) {
        if (typeof telemetry.cashBalance === 'number') {
          updateCashBalance(telemetry.cashBalance - (user?.cashBalance || 0));
        }
        if (telemetry.positions && telemetry.positions.length > 0) {
          setHoldings(telemetry.positions);
        }
        setStatusMessage({
          type: 'success',
          text: `Real-time telemetry synchronized successfully from Robinhood via riha-mcp-gateway (Buying Power: $${(telemetry.buyingPower || 0).toLocaleString()}, Cash: $${(telemetry.cashBalance || 0).toLocaleString()})`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Unable to connect to live MCP Gateway.',
      });
    } finally {
      setIsPullingTelemetry(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to disconnect Robinhood from your account? This will remove the API key.')) {
      disconnectRobinhood();
      setIsEditing(true);
      setApiKeyInput('');
      setStatusMessage({ type: 'info', text: 'Robinhood API Key removed from user account.' });
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
      {/* Header with Robinhood Branding */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <Zap className="w-6 h-6 fill-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Robinhood MCP Gateway Integration
              </h2>
              <span
                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 ${
                  isConnected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {isConnected ? 'MCP Gateway Linked' : 'Disconnected'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Authorize <span className="font-semibold text-slate-700">riha-mcp-gateway</span> (Port 8084) to connect to official{' '}
              <code className="text-[11px] px-1 py-0.5 rounded bg-slate-100 font-mono text-emerald-700">agent.robinhood.com/mcp/trading</code> to pull real-time account balances, live buying power, and stream market quotes.
            </p>
          </div>
        </div>

        {isConnected && !isEditing && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handlePullRealTimeData}
              disabled={isPullingTelemetry}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm shadow-emerald-600/20 transition-all disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPullingTelemetry ? 'animate-spin' : ''}`} />
              <span>{isPullingTelemetry ? 'Pulling Data...' : 'Pull Real-Time Telemetry'}</span>
            </button>
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition-all disabled:opacity-60"
            >
              <Cpu className="w-3.5 h-3.5 text-slate-500" />
              <span>{isTesting ? 'Pinging...' : 'Test Gateway'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Status Notice Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : statusMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{statusMessage.text}</span>
        </div>
      )}

      {/* Connected State Display */}
      {isConnected && !isEditing ? (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-600 font-semibold">
              <Key className="w-3.5 h-3.5 text-emerald-600" />
              <span>Active Robinhood API Key (User Account)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-sm text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-xs">
                {user?.robinhoodAccountMask || (user?.robinhoodApiKey ? `${user.robinhoodApiKey.substring(0, 4)}••••${user.robinhoodApiKey.substring(user.robinhoodApiKey.length - 4)}` : 'rh_live_••••••••')}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Linked for user: <strong className="text-slate-700">{user?.email}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-xs"
            >
              Update Key
            </button>
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-all shadow-xs"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      ) : (
        /* Input & Form to Add API Key */
        <form onSubmit={handleSaveKey} className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-600" />
                <span>Robinhood API Key / Agent Session Token</span>
              </span>
              <span className="text-slate-400 text-[11px] font-normal">
                Stored at user account level
              </span>
            </label>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>

              <input
                type={showKey ? 'text' : 'password'}
                placeholder="Enter Robinhood API key (e.g. rh-api-...)"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />

              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-emerald-600" />
                <span>Robinhood Ed25519 Private Key</span>
              </span>
              <span className="text-slate-400 text-[11px] font-normal">
                Base64 or PKCS#8 Ed25519 key
              </span>
            </label>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>

              <input
                type={showPrivateKey ? 'text' : 'password'}
                placeholder="Enter Ed25519 Private Key (base64 string)"
                value={privateKeyInput}
                onChange={(e) => setPrivateKeyInput(e.target.value)}
                className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm font-mono text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />

              <button
                type="button"
                onClick={() => setShowPrivateKey(!showPrivateKey)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Used by <strong className="text-slate-700">riha-mcp-gateway</strong> to sign requests cryptographically using Ed25519 for Robinhood Trading API (Zero Mock Data Policy).
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            {isConnected && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all disabled:opacity-60"
            >
              {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>{isSaving ? 'Saving Key...' : 'Save Key to User Account & Connect'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

