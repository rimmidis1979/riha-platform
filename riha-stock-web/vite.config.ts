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
        target: process.env.VITE_RIHA_STOCK_STRATEGY_API_URL || 'http://localhost:8093',
        changeOrigin: true,
      },
      '/api/v1/market': {
        target: process.env.VITE_RIHA_MARKET_INGESTOR_API_URL || 'http://localhost:8091',
        changeOrigin: true,
      },
      '/api/v1/mcp': {
        target: process.env.VITE_RIHA_MARKET_INGESTOR_API_URL || 'http://localhost:8091',
        changeOrigin: true,
      },
      '/api/v1/kb': {
        target: process.env.VITE_RIHA_RAG_API_URL || 'http://localhost:8088',
        changeOrigin: true,
      },
    },
  },
});

