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
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (res && !('headersSent' in res && res.headersSent)) {
              (res as any).writeHead(503, { 'Content-Type': 'application/json' });
              (res as any).end(JSON.stringify({
                title: '503 Service Unavailable - Auth Service Disconnected',
                status: 503,
                detail: 'Auth Service at ' + (process.env.VITE_RIHA_AUTH_API_URL || 'http://localhost:8080') + ' is currently unreachable.',
                timestamp: new Date().toISOString(),
              }));
            }
          });
        },
      },
      '/auth': {
        target: process.env.VITE_RIHA_AUTH_API_URL || 'http://localhost:8080',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, req, res) => {
            if (res && !('headersSent' in res && res.headersSent)) {
              if (req.url?.includes('/google/client-id')) {
                (res as any).writeHead(200, { 'Content-Type': 'application/json' });
                (res as any).end(JSON.stringify({
                  clientId: process.env.VITE_GOOGLE_CLIENT_ID || '268261615634-7u9ebko3tcl0e3pspq5vnsvn3ju6dhk5.apps.googleusercontent.com',
                  status: 'CONFIG_CLIENT_ID'
                }));
                return;
              }
              (res as any).writeHead(503, { 'Content-Type': 'application/json' });
              (res as any).end(JSON.stringify({
                title: '503 Service Unavailable - Auth Service Disconnected',
                status: 503,
                detail: 'Auth Service at ' + (process.env.VITE_RIHA_AUTH_API_URL || 'http://localhost:8080') + ' is currently unreachable.',
                timestamp: new Date().toISOString(),
              }));
            }
          });
        },
      },
      '/oauth2': {
        target: process.env.VITE_RIHA_AUTH_API_URL || 'http://localhost:8080',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (res && !('headersSent' in res && res.headersSent)) {
              (res as any).writeHead(503, { 'Content-Type': 'application/json' });
              (res as any).end(JSON.stringify({
                title: '503 Service Unavailable - OAuth2 Disconnected',
                status: 503,
                detail: 'OAuth2 endpoint is unreachable because Auth Service is offline.',
                timestamp: new Date().toISOString(),
              }));
            }
          });
        },
      },
      '/login/oauth2': {
        target: process.env.VITE_RIHA_AUTH_API_URL || 'http://localhost:8080',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            if (res && !('headersSent' in res && res.headersSent)) {
              (res as any).writeHead(503, { 'Content-Type': 'application/json' });
              (res as any).end(JSON.stringify({
                title: '503 Service Unavailable - OAuth2 Login Disconnected',
                status: 503,
                detail: 'OAuth2 login endpoint is unreachable because Auth Service is offline.',
                timestamp: new Date().toISOString(),
              }));
            }
          });
        },
      },
      '/api/v1/orchestrator': {
        target: process.env.VITE_RIHA_ORCHESTRATOR_API_URL || 'http://127.0.0.1:8090',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (res && !('headersSent' in res && res.headersSent)) {
              (res as any).writeHead(503, { 'Content-Type': 'application/json' });
              (res as any).end(JSON.stringify({
                title: '503 Service Unavailable - Orchestrator Disconnected',
                status: 503,
                detail: 'Orchestrator Service at ' + (process.env.VITE_RIHA_ORCHESTRATOR_API_URL || 'http://127.0.0.1:8090') + ' is currently unreachable.',
                timestamp: new Date().toISOString(),
              }));
            }
          });
        },
      },
      '/api/v1/mcp-gateway': {
        target: process.env.VITE_RIHA_MCP_GATEWAY_URL || 'http://127.0.0.1:8084',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/v1\/mcp-gateway/, '/api/v1/mcp'),
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (res && !('headersSent' in res && res.headersSent)) {
              (res as any).writeHead(503, { 'Content-Type': 'application/json' });
              (res as any).end(JSON.stringify({
                title: '503 Service Unavailable - MCP Gateway Disconnected',
                status: 503,
                detail: 'MCP Gateway at ' + (process.env.VITE_RIHA_MCP_GATEWAY_URL || 'http://127.0.0.1:8084') + ' is currently unreachable.',
                timestamp: new Date().toISOString(),
              }));
            }
          });
        },
      },
      '/api/v1/robinhood': {
        target: process.env.VITE_RIHA_ROBINHOOD_MCP_URL || 'http://127.0.0.1:8092',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (res && !('headersSent' in res && res.headersSent)) {
              (res as any).writeHead(503, { 'Content-Type': 'application/json' });
              (res as any).end(JSON.stringify({
                title: '503 Service Unavailable - Robinhood MCP Server Disconnected',
                status: 503,
                detail: 'Robinhood MCP Server at ' + (process.env.VITE_RIHA_ROBINHOOD_MCP_URL || 'http://127.0.0.1:8092') + ' is currently unreachable.',
                timestamp: new Date().toISOString(),
              }));
            }
          });
        },
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
                results: [],
                status: 'LIVE_RAG_DISCONNECTED',
              }));
            }
          });
        },
      },
    },
  },
});
