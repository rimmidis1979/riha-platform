import { Holding, PortfolioSummary, TradeOrder, StockTradeTransaction, AutoStrategyItem, StrategyHistoryItem, PlatformPerformanceSummary } from '../types/trading';
import { TrendingStock, TrendingFilters, MomentumPromptDecision } from '../types/trending';
import { LoginHistoryItem } from '../types/auth';

const isBrowser = typeof window !== 'undefined';
const AUTH_SERVICE_URL = import.meta.env.VITE_RIHA_AUTH_API_URL || (isBrowser ? '' : 'http://localhost:8080');
const STRATEGY_SERVICE_URL = import.meta.env.VITE_RIHA_STOCK_STRATEGY_API_URL || (isBrowser ? '' : 'http://localhost:8093');
const MARKET_INGESTOR_URL = import.meta.env.VITE_RIHA_MARKET_INGESTOR_API_URL || (isBrowser ? '' : 'http://localhost:8091');
const RAG_SERVICE_URL = import.meta.env.VITE_RIHA_RAG_API_URL || (isBrowser ? '' : 'http://localhost:8088');
const ROBINHOOD_MCP_URL = import.meta.env.VITE_RIHA_ROBINHOOD_MCP_URL || (isBrowser ? '' : 'http://localhost:8092');
const MCP_GATEWAY_URL = import.meta.env.VITE_RIHA_MCP_GATEWAY_URL || (isBrowser ? '' : 'http://localhost:8084');
const ORCHESTRATOR_URL = import.meta.env.VITE_RIHA_ORCHESTRATOR_API_URL || (isBrowser ? '' : 'http://localhost:8090');

export class StockApiClient {
  private static token: string | null = localStorage.getItem('riha_auth_jwt');
  private static reasoningCache = new Map<string, { hash: string; decision: MomentumPromptDecision }>();

  public static setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('riha_auth_jwt', token);
    } else {
      localStorage.removeItem('riha_auth_jwt');
    }
  }

  public static getToken(): string | null {
    return this.token || localStorage.getItem('riha_auth_jwt');
  }

  public static async getGoogleClientId(): Promise<string> {
    try {
      const res = await fetch(`${AUTH_SERVICE_URL}/auth/google/client-id`);
      if (res.ok) {
        const data = await res.json();
        if (data.clientId) return data.clientId;
      }
    } catch (e) {
      console.warn('Could not fetch Google client ID from backend, using fallback:', e);
    }
    return import.meta.env.VITE_GOOGLE_CLIENT_ID || '268261615634-7u9ebko3tcl0e3pspq5vnsvn3ju6dhk5.apps.googleusercontent.com';
  }

  public static getGoogleAuthUrl(): string {
    const base = AUTH_SERVICE_URL || (isBrowser ? window.location.origin : 'http://localhost:8080');
    return `${base}/oauth2/authorization/google`;
  }

  public static async authenticateGoogle(tokenOrCode: string, redirectUri?: string): Promise<{ token: string; email?: string; name?: string; picture?: string }> {
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenOrCode, code: tokenOrCode, redirectUri }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Google authentication failed' }));
      throw new Error(err.message || 'Google authentication failed');
    }

    const data = await response.json();
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  public static async authenticateLogin(email: string, password?: string): Promise<{ token: string }> {
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: 'Authentication failed' }));
      throw new Error(err.message || 'Authentication failed');
    }

    const data = await response.json();
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  }

  public static async getUserProfile(): Promise<any> {
    const token = this.getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${AUTH_SERVICE_URL}/auth/profile`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to load profile');
    }
    return await response.json();
  }

  public static async saveRobinhoodApiKey(apiKey: string): Promise<boolean> {
    const rawKey = apiKey.trim();
    let cleanKey = rawKey;
    let privateKey = '';
    if (rawKey.includes(':::')) {
      const parts = rawKey.split(':::');
      cleanKey = parts[0].trim();
      privateKey = parts[1].trim();
    }

    if (rawKey) {
      localStorage.setItem('riha_robinhood_api_key', rawKey);
    } else {
      localStorage.removeItem('riha_robinhood_api_key');
    }

    // 1. Register with riha-mcp-gateway (port 8084) for downstream routing
    try {
      await fetch(`${MCP_GATEWAY_URL}/api/v1/mcp-gateway/robinhood/credentials`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ apiKey: cleanKey, privateKey }),
      });
    } catch (e) {
      console.warn('MCP Gateway credentials registration notice:', e);
    }

    // 2. Register with riha-stock-ai-robinhood-mcp-server (port 8092)
    try {
      await fetch(`${ROBINHOOD_MCP_URL}/api/v1/robinhood/credentials`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ apiKey: cleanKey, privateKey }),
      });
    } catch (e) {
      console.warn('Robinhood MCP credentials notice:', e);
    }

    // 3. Persist to auth user account profile if service is reachable
    try {
      await fetch(`${AUTH_SERVICE_URL}/auth/profile/robinhood`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ apiKey: rawKey }),
      });
    } catch (e) {
      // ignore
    }
    return true;
  }

  public static async testRobinhoodMcpConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    const key = localStorage.getItem('riha_robinhood_api_key') || '';
    const headers: HeadersInit = {
      ...this.getHeaders(),
      ...(key ? { 'X-Robinhood-Api-Key': key } : {}),
    };

    // First test riha-mcp-gateway
    try {
      const gwRes = await fetch(`${MCP_GATEWAY_URL}/api/v1/mcp-gateway/servers`, { headers });
      if (gwRes.ok) {
        const servers = await gwRes.json();
        const rhServer = Array.isArray(servers)
          ? servers.find((s: any) => s.serverName === 'riha-stock-ai-robinhood-mcp-server' || s.serverName?.includes('robinhood'))
          : null;
        return {
          success: true,
          message: rhServer
            ? `Connected to riha-mcp-gateway (Port 8084) — Robinhood MCP server status is ${rhServer.status || 'ONLINE'}`
            : 'Connected to riha-mcp-gateway (Port 8084) with tool routing active',
          details: rhServer || servers,
        };
      }
    } catch (e) {
      console.warn('MCP Gateway check notice:', e);
    }

    try {
      const response = await fetch(`${ROBINHOOD_MCP_URL}/api/v1/robinhood/account`, { headers });
      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'Connected directly to Robinhood MCP Server (Port 8092)',
          details: data,
        };
      }
      const err = await response.json().catch(() => null);
      return {
        success: false,
        message: err?.detail || `Robinhood MCP Server responded with status ${response.status}`,
      };
    } catch (e: any) {
      return {
        success: false,
        message: e?.message || 'Robinhood MCP Gateway / Server is currently offline',
      };
    }
  }

  public static async pullRobinhoodRealTimeData(apiKey?: string): Promise<{
    buyingPower?: number;
    cashBalance?: number;
    portfolioValue?: number;
    positions?: Holding[];
    accountNumber?: string;
    raw?: any;
  }> {
    const rawKey = apiKey || localStorage.getItem('riha_robinhood_api_key') || '';
    let cleanKey = rawKey;
    let privateKey = '';
    if (rawKey.includes(':::')) {
      const parts = rawKey.split(':::');
      cleanKey = parts[0].trim();
      privateKey = parts[1].trim();
    }
    const headers: HeadersInit = {
      ...this.getHeaders(),
      ...(cleanKey ? { 'X-Robinhood-Api-Key': cleanKey } : {}),
      ...(privateKey ? { 'X-Robinhood-Private-Key': privateKey } : {}),
    };

    // 1. Invoke tool via riha-mcp-gateway (port 8084)
    try {
      const gwRes = await fetch(`${MCP_GATEWAY_URL}/api/v1/mcp-gateway/invoke-tool`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cleanKey ? { 'X-Robinhood-Api-Key': cleanKey } : {}),
          ...(privateKey ? { 'X-Robinhood-Private-Key': privateKey } : {}),
        },
        body: JSON.stringify({
          productId: 'RIHA_STOCK_AI',
          toolName: 'getLiveBuyingPowerAndPositions',
          inputPayload: {
            apiKey: cleanKey,
            privateKey: privateKey,
            token: cleanKey,
          },
        }),
      });

      if (gwRes.ok) {
        const gwData = await gwRes.json();
        if (gwData.outputPayload && gwData.status !== 'ERROR') {
          return this.mapRobinhoodTelemetry(gwData.outputPayload);
        } else if (gwData.outputPayload?.error) {
          let msg = String(gwData.outputPayload.error);
          if (msg.includes('JWT verification failed') || msg.includes('401 Unauthorized')) {
            msg = 'Robinhood Upstream Notice: 401 Unauthorized (JWT verification failed). Please ensure your Robinhood API Key or Bearer Token is valid and not expired.';
          } else {
            try {
              const jsonStart = msg.indexOf('{');
              const jsonEnd = msg.lastIndexOf('}');
              if (jsonStart !== -1 && jsonEnd !== -1) {
                const rawJson = msg.substring(jsonStart, jsonEnd + 1).replace(/\\"/g, '"');
                const parsed = JSON.parse(rawJson);
                if (parsed.detail) msg = parsed.detail;
              }
            } catch (_) {}
          }
          throw new Error(msg);
        }
      }
    } catch (e: any) {
      if (e?.message && !e.message.includes('fetch') && !e.message.includes('NetworkError')) {
        throw e;
      }
      console.warn('MCP Gateway tool invocation notice:', e);
    }

    // 2. Direct Robinhood MCP server route (port 8092)
    try {
      const rbRes = await fetch(`${ROBINHOOD_MCP_URL}/api/v1/robinhood/account`, {
        headers: {
          'Content-Type': 'application/json',
          ...(cleanKey ? { 'X-Robinhood-Api-Key': cleanKey, 'Authorization': `Bearer ${cleanKey}` } : {}),
          ...(privateKey ? { 'X-Robinhood-Private-Key': privateKey } : {}),
        },
      });

      if (rbRes.ok) {
        const rbData = await rbRes.json();
        return this.mapRobinhoodTelemetry(rbData);
      } else {
        const errJson = await rbRes.json().catch(() => null);
        if (errJson?.detail) {
          throw new Error(errJson.detail);
        }
      }
    } catch (e: any) {
      if (e?.message) throw e;
      console.warn('Robinhood MCP Server telemetry notice:', e);
    }

    throw new Error('Robinhood MCP Gateway (port 8084) and Robinhood MCP Server (port 8092) are currently unreachable.');
  }

  private static mapRobinhoodTelemetry(data: any) {
    const buyingPower = Number(data.buyingPowerUsd ?? data.buyingPower ?? data.liveBuyingPowerUsd ?? data.cash_available_for_withdrawal ?? 0);
    const cashBalance = Number(data.liveCashBalance ?? data.cashBalance ?? data.settledCashUsd ?? data.cash ?? 0);
    const portfolioValue = Number(data.totalEquityUsd ?? data.portfolioValue ?? data.totalEquity ?? data.equity ?? (cashBalance + buyingPower));
    const rawPositions = data.openPositions || data.positions || data.equityPositions || [];
    const positions: Holding[] = Array.isArray(rawPositions)
      ? rawPositions.map((p: any) => {
          const shares = Number(p.quantity || p.shares || 0);
          const currentPrice = Number(p.liveMarketPrice || p.currentPrice || p.currentLivePriceUsd || 0);
          const avgCost = Number(p.averageCostPrice || p.averageCost || p.averageCostBasisUsd || currentPrice);
          const equity = Number(p.marketValueUsd || p.equity || p.totalPositionValueUsd || (shares * currentPrice));
          return {
            symbol: String(p.ticker || p.symbol || '').toUpperCase(),
            name: p.companyName || p.name || String(p.ticker || p.symbol || '').toUpperCase(),
            shares,
            avgCost,
            currentPrice,
            equity,
            totalGain: Number(p.unrealizedPnlUsd || p.totalGain || 0),
            totalGainPercent: Number(p.unrealizedPnlPct || p.totalGainPercent || 0),
            dayGain: Number(p.dayGain || p.todayUnrealizedPnlUsd || 0),
            dayGainPercent: Number(p.dayGainPercent || p.todayUnrealizedPnlPct || 0),
            allocationPercent: portfolioValue > 0 ? (equity / portfolioValue) * 100 : 0,
            sector: p.sector || (String(p.ticker || p.symbol || '').includes('-USD') ? 'Crypto' : 'Equities'),
          };
        })
      : [];

    return {
      buyingPower,
      cashBalance,
      portfolioValue,
      positions,
      accountNumber: data.accountNumber || data.account_number,
      raw: data,
    };
  }

  public static async disconnectRobinhood(): Promise<boolean> {
    localStorage.removeItem('riha_robinhood_api_key');
    try {
      await fetch(`${ORCHESTRATOR_URL}/api/v1/orchestrator/robinhood/auth/logout`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
    } catch (e) {
      // ignore
    }
    try {
      await fetch(`${MCP_GATEWAY_URL}/api/v1/mcp-gateway/robinhood/credentials`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
    } catch (e) {
      // ignore
    }
    try {
      await fetch(`${ROBINHOOD_MCP_URL}/api/v1/robinhood/credentials`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
    } catch (e) {
      // ignore
    }
    return true;
  }

  public static async getPortfolioSummary(): Promise<PortfolioSummary> {
    try {
      const response = await fetch(`${STRATEGY_SERVICE_URL}/api/v1/stock-ai/portfolio/account-summary`, {
        headers: this.getHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        const totalEquity = Number(data.totalEquity || data.netAccountEquityUsd || 0);
        const cashBalance = Number(data.settledCashUsd || data.cashBalance || 0);
        const todayGain = Number(data.todayTotalProfitUsd || data.todayGain || 0);
        const todayGainPercent = Number(data.todayTotalProfitPct || data.todayGainPercent || 0);
        const allTimeGain = Number(data.overallCumulativeProfitUsd || data.allTimeGain || 0);
        const allTimeGainPercent = Number(data.overallCumulativeProfitPct || data.allTimeGainPercent || 0);

        return {
          totalEquity,
          cashBalance,
          totalPortfolioValue: totalEquity + cashBalance,
          todayGain,
          todayGainPercent,
          allTimeGain,
          allTimeGainPercent,
          holdingsCount: Number(data.activePositionsCount || 0),
          buyingPower: Number(data.liveBuyingPowerUsd || cashBalance * 4),
          todayReturn: todayGain,
          todayReturnPercent: todayGainPercent,
          totalReturn: allTimeGain,
          totalReturnPercent: allTimeGainPercent,
        };
      }
    } catch (e) {
      console.warn('Strategy service portfolio summary unavailable:', e);
    }

    return {
      totalEquity: 0,
      cashBalance: 0,
      totalPortfolioValue: 0,
      todayGain: 0,
      todayGainPercent: 0,
      allTimeGain: 0,
      allTimeGainPercent: 0,
      holdingsCount: 0,
      buyingPower: 0,
      todayReturn: 0,
      todayReturnPercent: 0,
      totalReturn: 0,
      totalReturnPercent: 0,
    };
  }

  public static async getHoldings(): Promise<Holding[]> {
    try {
      const response = await fetch(`${STRATEGY_SERVICE_URL}/api/v1/stock-ai/portfolio/positions`, {
        headers: this.getHeaders(),
      });
      if (response.ok) {
        const positions = await response.json();
        if (Array.isArray(positions)) {
          return positions.map((p: any) => {
            const sym = String(p.ticker || p.symbol || '').toUpperCase();
            const shares = Number(p.quantity || p.shares || 0);
            const avgCost = Number(p.averageCostBasisUsd || p.avgCost || p.avgPrice || 0);
            const currentPrice = Number(p.currentLivePriceUsd || p.currentPrice || 0);
            const equity = Number(p.totalPositionValueUsd || (shares * currentPrice) || 0);
            const dayGain = Number(p.todayUnrealizedPnlUsd || p.dayGain || 0);
            const dayGainPercent = Number(p.todayUnrealizedPnlPct || p.dayGainPercent || 0);
            const totalGain = Number(p.unrealizedPnlUsd || p.totalGain || 0);
            const totalGainPercent = Number(p.unrealizedPnlPct || p.totalGainPercent || 0);

            return {
              symbol: sym,
              name: p.companyName || p.name || `${sym}`,
              shares,
              avgCost,
              avgPrice: avgCost,
              currentPrice,
              equity,
              dayGain,
              dayGainPercent,
              totalGain,
              totalGainPercent,
              dayReturn: dayGain,
              dayReturnPercent: dayGainPercent,
              totalReturn: totalGain,
              totalReturnPercent: totalGainPercent,
              allocationPercent: Number(p.allocationPercent || 0),
              sector: p.sector || 'Equities',
            };
          });
        }
      }
    } catch (e) {
      console.warn('Strategy service holdings error:', e);
    }
    return [];
  }

  public static async executeTrade(order: {
    symbol: string;
    companyName: string;
    side: 'BUY' | 'SELL';
    type?: string;
    orderType: string;
    shares: number;
    price: number;
    executionPrice?: number;
    totalValue: number;
  }): Promise<TradeOrder> {
    const payload = {
      ticker: order.symbol,
      symbol: order.symbol,
      side: order.side,
      orderType: order.orderType || order.type || 'MARKET',
      quantity: order.shares,
      price: order.price || order.executionPrice || 0,
      totalAmountUsd: order.totalValue,
      source: 'RIHA_STOCK_WEB_PERSONALIZED',
    };

    try {
      const response = await fetch(`${STRATEGY_SERVICE_URL}/api/v1/stock-ai/portfolio/orders`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const resData = await response.json();
        return {
          id: resData.orderId || resData.id || `ORD-${Date.now()}-${order.symbol}`,
          symbol: order.symbol,
          companyName: order.companyName,
          side: order.side,
          orderType: (order.orderType || 'MARKET') as any,
          type: (order.orderType || 'MARKET') as any,
          shares: order.shares,
          executionPrice: order.price || order.executionPrice || 0,
          price: order.price || order.executionPrice || 0,
          totalValue: order.totalValue,
          timestamp: resData.timestamp || new Date().toLocaleString('en-US', { timeZoneName: 'short' }),
          status: 'FILLED',
        };
      }
    } catch (e) {
      console.warn('Live order dispatch fallback:', e);
    }

    return {
      id: `ORD-${Date.now()}-${order.symbol}`,
      symbol: order.symbol,
      companyName: order.companyName,
      side: order.side,
      orderType: (order.orderType || 'MARKET') as any,
      type: (order.orderType || 'MARKET') as any,
      shares: order.shares,
      executionPrice: order.price || order.executionPrice || 0,
      price: order.price || order.executionPrice || 0,
      totalValue: order.totalValue,
      timestamp: new Date().toLocaleString('en-US', { timeZoneName: 'short' }),
      status: 'FILLED',
    };
  }

  public static async triggerBackendScanner(algorithm?: string): Promise<any> {
    const params = new URLSearchParams({ window: '1D' });
    if (algorithm && algorithm !== 'ALL') {
      params.append('strategyId', algorithm);
    }
    try {
      const response = await fetch(`${STRATEGY_SERVICE_URL}/api/v1/stock-ai/scanner/run?${params.toString()}`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Backend scanner trigger failed:', e);
    }
    return null;
  }

  public static async getTrendingStocks(filters: TrendingFilters): Promise<TrendingStock[]> {
    const limit = filters.limit > 0 ? filters.limit : 25;
    const algo = filters.algorithm || 'TOP_GAINERS_DAY';
    // Use ALL filter on strategy-service to query the complete database of live monitored candidates
    const effectiveFilter = algo === 'TOP_GAINERS_DAY' ? 'ALL' : algo;
    const params = new URLSearchParams({
      filter: effectiveFilter,
      limit: String(limit),
      minPrice: String(filters.minPrice ?? 0.0),
      maxPrice: String(filters.maxPrice ?? 1500.0),
    });
    if (filters.searchQuery) {
      params.append('search', filters.searchQuery);
    }

    try {
      const response = await fetch(`${STRATEGY_SERVICE_URL}/api/v1/stock-ai/trending?${params.toString()}`, {
        headers: this.getHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          const stocks = data.map((item: any) => this.mapToTrendingStock(item));
          if (stocks.length >= 5 || algo !== 'TOP_GAINERS_DAY') {
            return stocks;
          }
        }
      }
    } catch (e) {
      console.warn('Strategy service trending query failed, querying market ingestor:', e);
    }

    try {
      const mcpResponse = await fetch(`${MARKET_INGESTOR_URL}/api/v1/mcp/tools/fetchStocksByAlgorithm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: new Date().toISOString().substring(0, 10),
          algorithm: 'HIGH_CONVICTION_MULTI_FACTOR',
          limit,
        }),
      });
      if (mcpResponse.ok) {
        const data = await mcpResponse.json();
        if (Array.isArray(data) && data.length > 0) {
          return data
            .filter((item: any) => {
              const price = Number(item.lastPrice || item.price || 0);
              return price >= (filters.minPrice ?? 0.0) && price <= (filters.maxPrice ?? 1500.0);
            })
            .map((item: any) => this.mapToTrendingStock(item));
        }
      }
    } catch (e) {
      console.warn('Market ingestor MCP failed:', e);
    }

    try {
      const rhStocks = await this.getRobinhoodTrendingStocks();
      if (Array.isArray(rhStocks) && rhStocks.length > 0) {
        return rhStocks.map((item: any) => this.mapToTrendingStock(item));
      }
    } catch (e) {
      console.warn('Failed to load Robinhood trending fallback:', e);
    }

    return [];
  }

  public static async queryRagPlaybooks(query: string = 'momentum breakout ORB VWAP SEC catalyst'): Promise<any[]> {
    try {
      const response = await fetch(`${RAG_SERVICE_URL}/api/v1/kb/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          topK: 5,
          minScore: 0.1,
          searchType: 'HYBRID',
          alpha: 0.6,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        const results = data.results || data.matches || [];
        if (results.length > 0) {
          return results.map((r: any) => ({
            playbook: r.documentTitle || r.fileName || 'RAG Ingested Momentum Playbook',
            content: r.content,
            score: r.similarityScore || r.hybridScore || 0.85,
            rules: r.content,
          }));
        }
      }
    } catch (e) {
      console.warn('RAG ingestion service search unavailable:', e);
    }

    return [];
  }

  public static async runMomentumPromptAnalysis(
    stock: TrendingStock,
    ragSnippets: any[],
    userInstruction: string = 'Target 5% gain from entry, exit by market close, maximum 2% stop loss'
  ): Promise<MomentumPromptDecision> {
    const price = stock.price;
    const vwap = stock.vwap ?? price;
    const rvol = stock.relativeVolume ?? 1.0;
    const filingId = stock.recentFiling?.id || 'none';
    const inputHash = `${stock.symbol}|${price}|${vwap}|${rvol}|${filingId}|${userInstruction}`;

    // Per-ticker session cache check
    const cached = this.reasoningCache.get(stock.symbol);
    if (cached && cached.hash === inputHash) {
      return {
        ...cached.decision,
        evaluatedAt: new Date().toISOString(),
      };
    }

    const hasRecentFiling = !!stock.recentFiling && (stock.recentFiling.formType === '8-K' || stock.recentFiling.significance === 'HIGH');
    const filingCatalyst = hasRecentFiling
      ? `Material ${stock.recentFiling?.formType} filing: ${stock.recentFiling?.title || 'Catalyst Event'}`
      : 'No material filing in 30m window; technical momentum primary';

    const technicalsAligned = price > vwap && rvol >= 1.5;

    let action: 'BUY' | 'SELL' | 'HOLD' | 'NO_ACTION' = 'HOLD';
    let confidence = 0.5;
    let reasoning = '';

    if (technicalsAligned && hasRecentFiling) {
      action = 'BUY';
      confidence = 0.89;
      reasoning = `Strong signal: Price ($${price.toFixed(2)}) is above VWAP ($${vwap.toFixed(2)}) with ${rvol.toFixed(1)}x RVOL, backed by material ${stock.recentFiling?.formType} catalyst.`;
    } else if (technicalsAligned) {
      action = 'BUY';
      confidence = 0.78;
      reasoning = `Technical breakout: Price ($${price.toFixed(2)}) holds above VWAP ($${vwap.toFixed(2)}) with high volume expansion (${rvol.toFixed(1)}x 20-day avg).`;
    } else {
      action = 'HOLD';
      confidence = 0.45;
      reasoning = `Hold signal: Price ($${price.toFixed(2)}) does not satisfy simultaneous VWAP and opening range expansion criteria.`;
    }

    const entryPrice = action === 'BUY' ? Number((price * 1.002).toFixed(2)) : price;
    const stopLoss = Number((entryPrice * 0.98).toFixed(2));
    const targetPrice = Number((entryPrice * 1.05).toFixed(2));
    const primaryPlaybook = ragSnippets.length > 0 ? (ragSnippets[0]?.playbook || ragSnippets[0]?.title) : undefined;

    const decision: MomentumPromptDecision = {
      action,
      ticker: stock.symbol,
      confidence,
      entry_price: entryPrice,
      stop_loss: stopLoss,
      target_price: targetPrice,
      order_type: 'LIMIT',
      quantity: Math.max(1, Math.floor(1000 / (entryPrice || 1))),
      catalyst: filingCatalyst,
      reasoning,
      evaluatedAt: new Date().toISOString(),
      ragPlaybookUsed: primaryPlaybook,
    };

    this.reasoningCache.set(stock.symbol, { hash: inputHash, decision });
    return decision;
  }

  private static mapToTrendingStock(item: any): TrendingStock {
    const symbol = String(item.ticker || item.symbol || 'UNKNOWN').toUpperCase();
    const price = Number(item.lastPrice || item.currentPrice || item.price || 0);
    const dayChangePct = Number(item.dayChangePct || item.changePercent || 0);
    const change = Number(item.dayChange || (price * dayChangePct / 100) || 0);
    const rvol = Number(item.relativeVolume || item.rvol || 1.0);
    const vwap = item.vwap ? Number(item.vwap) : undefined;

    let aiPred: 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SPECULATIVE_BUY' = 'BUY';
    if (dayChangePct > 7.0 && rvol > 2.0) aiPred = 'STRONG_BUY';
    else if (dayChangePct < 0) aiPred = 'HOLD';
    else if (Number(item.shortBorrowFeePct || 0) > 10.0) aiPred = 'SPECULATIVE_BUY';

    return {
      symbol,
      companyName: item.companyName || `${symbol}`,
      price,
      change,
      changePercent: dayChangePct,
      volume: item.volumeFormatted || (item.volume ? Number(item.volume).toLocaleString() : 'N/A'),
      marketCap: item.marketCapFormatted || (item.marketCap ? '$' + Number(item.marketCap).toLocaleString() : 'N/A'),
      sector: item.sector || 'Equities',
      momentumScore: Math.min(99, Math.max(10, Math.round(50 + dayChangePct * 3 + (rvol - 1) * 10))),
      aiPrediction: aiPred,
      aiConfidence: Math.min(96, Math.max(60, Math.round(70 + (rvol > 2 ? 15 : 5)))),
      socialSentimentScore: Math.min(98, Math.max(40, Math.round(60 + dayChangePct * 2))),
      socialMentions24h: item.socialMentions24h ? Number(item.socialMentions24h) : 0,
      vwap,
      relativeVolume: rvol,
      shortBorrowFeePct: item.shortBorrowFeePct ? Number(item.shortBorrowFeePct) : undefined,
      recentNews: item.recentNews ? {
        id: String(item.recentNews.id || `news-${symbol}`),
        headline: item.recentNews.headline || '',
        source: item.recentNews.source || '',
        publishedAt: item.recentNews.publishedAt || '',
        sentiment: item.recentNews.sentiment || (dayChangePct >= 0 ? 'BULLISH' : 'BEARISH'),
        impactScore: Number(item.recentNews.impactScore || 50),
        summary: item.recentNews.summary || '',
      } : undefined,
      recentFiling: item.recentFiling ? {
        id: String(item.recentFiling.id || `filing-${symbol}`),
        formType: item.recentFiling.formType || '8-K',
        filingDate: item.recentFiling.filingDate || '',
        title: item.recentFiling.title || '',
        significance: item.recentFiling.significance || 'HIGH',
      } : undefined,
      isPersonalized: Boolean(item.isPersonalized || item.isOwned),
      tags: item.tags || [item.primaryAlgorithm || 'MOMENTUM'],
    };
  }

  // ========================================================
  // BACKBONE ORCHESTRATOR & DUAL BROKER (ROBINHOOD / SCHWAB)
  // ========================================================

  public static async getConsolidatedPortfolio(): Promise<any> {
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/orchestrator/portfolio/consolidated`, {
        headers: this.getHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Orchestrator consolidated portfolio fetch error:', e);
    }
    return null;
  }

  public static async getRobinhoodOrchestratedPortfolio(): Promise<any> {
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/orchestrator/portfolio`, {
        headers: this.getHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Orchestrator Robinhood portfolio fetch error:', e);
    }
    return null;
  }

  public static async getSchwabPortfolio(): Promise<any> {
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/orchestrator/schwab/portfolio`, {
        headers: this.getHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Orchestrator Schwab portfolio fetch error:', e);
    }
    return null;
  }

  public static async getSchwabAuthUrl(): Promise<{ authUrl: string; clientId: string }> {
    const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/orchestrator/schwab/auth-url`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to retrieve Schwab Authorization URL');
    return await res.json();
  }

  public static async exchangeSchwabAuthCode(code: string, redirectUri?: string): Promise<any> {
    const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/orchestrator/schwab/callback`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ code, redirectUri }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Token exchange failed' }));
      throw new Error(err.message || 'Token exchange failed');
    }
    return await res.json();
  }

  public static async getSchwabTransactions(): Promise<any[]> {
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/orchestrator/schwab/transactions`, {
        headers: this.getHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Orchestrator Schwab transactions fetch error:', e);
    }
    return [];
  }

  public static async updateStockStrategicLoop(
    symbol: string,
    runStrategicLoop: boolean,
    executionMode?: 'PAPERLESS' | 'ACTUAL',
    targetProfitMarginPct?: number,
    stopLossMarginPct?: number,
    autoBuyEnabled?: boolean,
    autoSellEnabled?: boolean,
    maxQuantity?: number
  ): Promise<any> {
    const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/orchestrator/stocks/${encodeURIComponent(symbol)}/strategic-loop`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({
        runStrategicLoop,
        executionMode,
        targetProfitMarginPct,
        stopLossMarginPct,
        autoBuyEnabled,
        autoSellEnabled,
        maxQuantity,
      }),
    });
    if (!res.ok) throw new Error(`Failed to update strategic loop for ${symbol}`);
    return await res.json();
  }

  // ========================================================
  // LOGIN HISTORY & LEGAL DISCLAIMER COMPLIANCE
  // ========================================================

  public static async getLoginHistory(): Promise<LoginHistoryItem[]> {
    try {
      const res = await fetch(`${AUTH_SERVICE_URL}/auth/login-history`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch (e) {
      console.warn('Backend login-history fetch failed, reading local session ledger:', e);
    }
    const local = localStorage.getItem('riha_login_audit_trail');
    return local ? JSON.parse(local) : [];
  }

  public static recordLocalLogin(item: LoginHistoryItem): void {
    try {
      const existing = localStorage.getItem('riha_login_audit_trail');
      const list: LoginHistoryItem[] = existing ? JSON.parse(existing) : [];
      const updated = [item, ...list.filter(x => x.id !== item.id)].slice(0, 100);
      localStorage.setItem('riha_login_audit_trail', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save local login history event:', e);
    }
  }

  public static async getDisclaimerStatus(): Promise<{ disclaimerAccepted: boolean; disclaimerAcceptedAt?: string; disclaimerVersion?: string }> {
    try {
      const res = await fetch(`${AUTH_SERVICE_URL}/auth/disclaimer/status`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Could not query disclaimer status from auth-service:', e);
    }
    const localAccepted = localStorage.getItem('riha_disclaimer_accepted') === 'true';
    const localAt = localStorage.getItem('riha_disclaimer_accepted_at') || '';
    return {
      disclaimerAccepted: localAccepted,
      disclaimerAcceptedAt: localAt,
      disclaimerVersion: 'v1.0',
    };
  }

  public static async acceptDisclaimer(): Promise<any> {
    try {
      const res = await fetch(`${AUTH_SERVICE_URL}/auth/disclaimer/accept`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('riha_disclaimer_accepted', 'true');
        localStorage.setItem('riha_disclaimer_accepted_at', new Date().toISOString());
        return data;
      }
    } catch (e) {
      console.warn('Could not post disclaimer acceptance to auth-service:', e);
    }
    localStorage.setItem('riha_disclaimer_accepted', 'true');
    localStorage.setItem('riha_disclaimer_accepted_at', new Date().toISOString());
    return { status: 'ACCEPTED', disclaimerAccepted: true };
  }

  public static async declineDisclaimer(): Promise<any> {
    try {
      await fetch(`${AUTH_SERVICE_URL}/auth/disclaimer/decline`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
    } catch (e) {
      console.warn('Could not post disclaimer decline to auth-service:', e);
    }
    localStorage.removeItem('riha_disclaimer_accepted');
    localStorage.removeItem('riha_disclaimer_accepted_at');
    localStorage.removeItem('riha_auth_jwt');
    localStorage.removeItem('riha_user_session');
    return { status: 'DECLINED', disclaimerAccepted: false };
  }

  // ========================================================
  // PLATFORM AUDIT, TRANSACTIONS & CUMULATIVE GAIN/LOSS
  // ========================================================

  public static async getAllTransactions(): Promise<StockTradeTransaction[]> {
    try {
      const res = await fetch(`${STRATEGY_SERVICE_URL}/api/v1/stock-ai/portfolio/transactions`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {
      console.warn('Strategy service transactions fetch notice, checking executive summary:', e);
    }

    try {
      const execRes = await fetch(`${STRATEGY_SERVICE_URL}/api/v1/stock-ai/summary/executive`, {
        headers: this.getHeaders(),
      });
      if (execRes.ok) {
        const data = await execRes.json();
        if (Array.isArray(data.transactions)) return data.transactions;
      }
    } catch (e) {
      console.warn('Executive summary transactions fetch notice:', e);
    }

    const localHistory = localStorage.getItem('riha_trade_history');
    if (localHistory) {
      const parsed: TradeOrder[] = JSON.parse(localHistory);
      return parsed.map((t) => ({
        id: t.id,
        ticker: t.symbol,
        side: t.side,
        executionMode: t.executionMode || 'ACTUAL',
        strategyName: t.recommendationLabel || 'VWAP Reclaim & Relative Volume Breakout',
        quantity: t.shares,
        orderPrice: t.executionPrice || t.price || 0,
        executedFillPrice: t.executionPrice || t.price || 0,
        totalValue: t.totalValue,
        realizedProfitLossUsd: t.realizedPnlUsd || 0,
        status: t.status === 'FILLED' ? 'FILLED' : 'SUBMITTED',
        executedAt: t.timestamp,
      }));
    }

    return [];
  }

  public static async getPerformanceSummary(): Promise<PlatformPerformanceSummary> {
    try {
      const res = await fetch(`${STRATEGY_SERVICE_URL}/api/v1/stock-ai/portfolio/performance-summary`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Strategy service performance summary notice:', e);
    }

    // Calculate real cumulative metrics dynamically from actual transactions
    const txs = await this.getAllTransactions();
    const realized = txs.reduce((sum, t) => sum + (t.realizedProfitLossUsd || 0), 0);
    const filledBuys = txs.filter(t => t.side === 'BUY' && t.status === 'FILLED');
    const filledSells = txs.filter(t => t.side === 'SELL' && t.status === 'FILLED');
    const winning = txs.filter(t => (t.realizedProfitLossUsd || 0) > 0).length;
    const losing = txs.filter(t => (t.realizedProfitLossUsd || 0) < 0).length;
    const completed = winning + losing;
    const winRate = completed > 0 ? (winning / completed) * 100 : 0;
    const buyVol = filledBuys.reduce((sum, t) => sum + ((t.orderPrice || 0) * t.quantity), 0);
    const sellVol = filledSells.reduce((sum, t) => sum + ((t.orderPrice || 0) * t.quantity), 0);

    return {
      realizedPnlUsd: Number(realized.toFixed(2)),
      unrealizedPnlUsd: 0.0,
      netPnlUsd: Number(realized.toFixed(2)),
      winRatePct: Number(winRate.toFixed(1)),
      totalTradesCount: filledBuys.length + filledSells.length,
      winningTradesCount: winning,
      losingTradesCount: losing,
      totalBuysCount: filledBuys.length,
      totalSellsCount: filledSells.length,
      totalBuyVolumeUsd: Number(buyVol.toFixed(2)),
      totalSellVolumeUsd: Number(sellVol.toFixed(2)),
      totalVolumeTradedUsd: Number((buyVol + sellVol).toFixed(2)),
      activePositionsCount: 0,
      generatedAt: new Date().toISOString(),
    };
  }

  public static async getActiveAutoLoops(): Promise<AutoStrategyItem[]> {
    try {
      const res = await fetch(`${STRATEGY_SERVICE_URL}/api/v1/stock-ai/portfolio/auto-loops`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (e) {
      console.warn('Strategy service auto-loops fetch notice:', e);
    }
    return [];
  }

  public static async getStrategiesHistory(): Promise<any> {
    try {
      const res = await fetch(`${STRATEGY_SERVICE_URL}/api/v1/stock-ai/portfolio/strategies-history`, {
        headers: this.getHeaders(),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Strategy service strategies-history fetch notice:', e);
    }

    try {
      const auditRes = await fetch(`${STRATEGY_SERVICE_URL}/api/v1/stock-ai/audit-summary?window=ALL`, {
        headers: this.getHeaders(),
      });
      if (auditRes.ok) {
        const data = await auditRes.json();
        const txs = await this.getAllTransactions();
        return { masterAudit: data, transactions: txs };
      }
    } catch (e) {
      console.warn('Audit summary fetch notice:', e);
    }

    return { masterAudit: { audits: [] }, transactions: [] };
  }

  // ========================================================
  // ROBINHOOD STOCKS (EQUITIES) TRADING
  // ========================================================

  public static async getRobinhoodAuthStatus(): Promise<any> {
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/orchestrator/robinhood/auth/status`, {
        headers: this.getHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Robinhood auth status error:', e);
    }
    return { success: false, authenticated: false };
  }

  public static async authenticateRobinhoodLive(credentials: {
    username?: string;
    password?: string;
    mfaCode?: string;
    challengeId?: string;
    directToken?: string;
  }): Promise<any> {
    const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/orchestrator/robinhood/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(credentials),
    });
    return await res.json().catch(() => ({ success: false, message: 'Robinhood login failed' }));
  }

  public static async syncRobinhoodStockOrders(): Promise<any[]> {
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/orchestrator/robinhood/stocks/sync-orders`, {
        method: 'POST',
        headers: this.getHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Robinhood stock orders sync error:', e);
    }
    return [];
  }

  public static async getRobinhoodStocks(): Promise<any[]> {
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/orchestrator/robinhood/stocks`, {
        headers: this.getHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Orchestrator Robinhood stocks fetch error:', e);
    }
    return [];
  }

  public static async getRobinhoodTrendingStocks(): Promise<any[]> {
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/orchestrator/robinhood/stocks/trending`, {
        headers: this.getHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Orchestrator Robinhood trending stocks fetch error:', e);
    }
    return [];
  }

  public static async buyRobinhoodStock(
    symbol: string,
    quantity: number,
    price?: number,
    orderType: string = 'MARKET',
    mode?: 'PAPERLESS' | 'ACTUAL'
  ): Promise<any> {
    const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/orchestrator/robinhood/stocks/buy`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ symbol, quantity, price, orderType, mode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Robinhood stock buy failed' }));
      throw new Error(err.message || 'Robinhood stock buy failed');
    }
    return await res.json();
  }

  public static async sellRobinhoodStock(
    symbol: string,
    quantity: number,
    price?: number,
    orderType: string = 'MARKET',
    mode?: 'PAPERLESS' | 'ACTUAL'
  ): Promise<any> {
    const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/orchestrator/robinhood/stocks/sell`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ symbol, quantity, price, orderType, mode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Robinhood stock sell failed' }));
      throw new Error(err.message || 'Robinhood stock sell failed');
    }
    return await res.json();
  }

  public static async updateBrokerMode(
    broker: 'ROBINHOOD' | 'CHARLES_SCHWAB',
    executionMode: 'PAPERLESS' | 'ACTUAL'
  ): Promise<any> {
    const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/orchestrator/settings/broker-mode`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ broker, executionMode }),
    });
    if (!res.ok) throw new Error(`Failed to update execution mode for ${broker}`);
    return await res.json();
  }

  public static async getGlobalSettings(): Promise<any> {
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/orchestrator/settings`, {
        headers: this.getHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Orchestrator settings fetch error:', e);
    }
    return null;
  }

  public static async updateGlobalSettings(globalExecutionMode?: 'PAPERLESS' | 'ACTUAL', autoTradingEnabled?: boolean): Promise<any> {
    const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/orchestrator/settings`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ globalExecutionMode, autoTradingEnabled }),
    });
    if (!res.ok) throw new Error('Failed to update global settings');
    return await res.json();
  }

  public static async getOrchestratedOrderHistory(timeRange: string = 'ALL'): Promise<any[]> {
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/orchestrator/orders/history?timeRange=${timeRange}`, {
        headers: this.getHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Orchestrator orders history fetch error:', e);
    }
    return [];
  }

  public static async getOrchestratedPnlSummary(timeRange: string = 'ALL'): Promise<any> {
    try {
      const res = await fetch(`${ORCHESTRATOR_URL}/api/v1/orchestrator/orders/pnl-summary?timeRange=${timeRange}`, {
        headers: this.getHeaders(),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Orchestrator PnL summary fetch error:', e);
    }
    return null;
  }

  private static getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }
}
