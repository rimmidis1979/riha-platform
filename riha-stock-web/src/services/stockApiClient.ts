import { Holding, TradeOrder } from '../types/trading';
import { TrendingStock } from '../types/trending';
import { INITIAL_HOLDINGS, INITIAL_TRADE_HISTORY, INITIAL_TRENDING_STOCKS } from './mockData';

const AUTH_SERVICE_URL = import.meta.env.VITE_RIHA_AUTH_API_URL || 'http://localhost:8080';
const STRATEGY_SERVICE_URL = import.meta.env.VITE_RIHA_STOCK_STRATEGY_API_URL || 'http://localhost:8093';
const MARKET_INGESTOR_URL = import.meta.env.VITE_RIHA_MARKET_INGESTOR_API_URL || 'http://localhost:8091';

export class StockApiClient {
  private static token: string | null = null;

  public static setToken(token: string | null) {
    this.token = token;
  }

  // Google OAuth URL endpoint
  public static getGoogleAuthUrl(): string {
    return `${AUTH_SERVICE_URL}/oauth2/authorization/google`;
  }

  // Fetch holdings
  public static async getHoldings(): Promise<Holding[]> {
    try {
      const response = await fetch(`${STRATEGY_SERVICE_URL}/api/v1/stock-ai/portfolio/holdings`, {
        headers: this.getHeaders(),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('API Gateway offline, falling back to local state:', e);
    }
    return INITIAL_HOLDINGS;
  }

  // Execute Buy / Sell Order
  public static async executeTrade(order: Omit<TradeOrder, 'id' | 'timestamp' | 'status'>): Promise<TradeOrder> {
    const payload = {
      ...order,
      timestamp: new Date().toISOString(),
    };

    try {
      const response = await fetch(`${STRATEGY_SERVICE_URL}/api/v1/stock-ai/orders/execute`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Live order gateway simulated:', e);
    }

    // Local execution fallback
    return {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}-${order.symbol}`,
      ...order,
      timestamp: new Date().toLocaleString('en-US', { timeZoneName: 'short' }),
      status: 'FILLED',
    };
  }

  // Fetch Trending Stocks
  public static async getTrendingStocks(): Promise<TrendingStock[]> {
    try {
      const response = await fetch(`${MARKET_INGESTOR_URL}/api/v1/market/trending`, {
        headers: this.getHeaders(),
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.warn('Market ingestor stream using fallback feed:', e);
    }
    return INITIAL_TRENDING_STOCKS;
  }

  private static getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }
}
