import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    proxy: {
      '/api/v1/stock-ai': {
        target: process.env.VITE_RIHA_STOCK_STRATEGY_API_URL || 'http://localhost:8093',
        changeOrigin: true,
      },
      '/api/v1/orchestrator': {
        target: process.env.VITE_RIHA_ORCHESTRATOR_API_URL || 'http://localhost:8083',
        changeOrigin: true,
      },
      '/api/v1/critic': {
        target: process.env.VITE_RIHA_CRITIC_API_URL || 'http://localhost:8085',
        changeOrigin: true,
      },
      '/api/v1/prompts': {
        target: process.env.VITE_RIHA_VCH_API_URL || 'http://localhost:8089',
        changeOrigin: true,
      },
    },
  },
});

