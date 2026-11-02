import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    host: true,
    proxy: {
      '/api/v1/auth': {
        target: process.env.VITE_RIHA_AUTH_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/auth': {
        target: process.env.VITE_RIHA_AUTH_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/oauth2': {
        target: process.env.VITE_RIHA_AUTH_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/login/oauth2': {
        target: process.env.VITE_RIHA_AUTH_API_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/api/v1/stock-ai': {
        target: process.env.VITE_RIHA_STOCK_STRATEGY_API_URL || 'http://127.0.0.1:8093',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (res && !('headersSent' in res && res.headersSent)) {
              (res as any).writeHead(503, { 'Content-Type': 'application/json' });
              (res as any).end(JSON.stringify({
                title: '503 Service Unavailable - Strategy Service Disconnected',
                status: 503,
                detail: 'Strategy Service at ' + (process.env.VITE_RIHA_STOCK_STRATEGY_API_URL || 'http://127.0.0.1:8093') + ' is currently unreachable.',
                timestamp: new Date().toISOString(),
              }));
            }
          });
        },
      },
      '/api/v1/market': {
        target: process.env.VITE_RIHA_MARKET_INGESTOR_API_URL || 'http://127.0.0.1:8091',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (res && !('headersSent' in res && res.headersSent)) {
              (res as any).writeHead(503, { 'Content-Type': 'application/json' });
              (res as any).end(JSON.stringify({
                title: '503 Service Unavailable - Market Ingestor Disconnected',
                status: 503,
                detail: 'Market Ingestor at ' + (process.env.VITE_RIHA_MARKET_INGESTOR_API_URL || 'http://127.0.0.1:8091') + ' is currently unreachable.',
                timestamp: new Date().toISOString(),
              }));
            }
          });
        },
      },
      '/api/v1/mcp': {
        target: process.env.VITE_RIHA_MARKET_INGESTOR_API_URL || 'http://127.0.0.1:8091',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (res && !('headersSent' in res && res.headersSent)) {
              (res as any).writeHead(503, { 'Content-Type': 'application/json' });
              (res as any).end(JSON.stringify({
                title: '503 Service Unavailable - MCP Server Disconnected',
                status: 503,
                detail: 'MCP Server is currently unreachable.',
                timestamp: new Date().toISOString(),
              }));
            }
          });
        },
      },
      '/api/v1/kb': {
        target: process.env.VITE_RIHA_RAG_API_URL || 'http://localhost:8088',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (res && !('headersSent' in res && res.headersSent)) {
              (res as any).writeHead(200, { 'Content-Type': 'application/json' });
              (res as any).end(JSON.stringify({
                results: [
                  {
                    documentTitle: 'ORB 15-Minute Volume Spike Playbook',
                    content: 'Opening Range Breakout (ORB) on 15m candle with RVOL > 2.0 and VWAP confirmation.',
                    similarityScore: 0.95,
                    hybridScore: 0.95,
                  },
                  {
                    documentTitle: 'VWAP Reclaim Momentum Playbook',
                    content: 'Price reclaims VWAP with EMA 9/21 cross and sustained volume expansion.',
                    similarityScore: 0.92,
                    hybridScore: 0.92,
                  },
                ],
                status: 'FALLBACK_LOCAL_PLAYBOOKS',
              }));
            }
          });
        },
      },
    },
  },
});
