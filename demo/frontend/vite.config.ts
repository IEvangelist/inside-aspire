import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // The AppHost explicitly supplies these aliases for the native HTTP API.
      '/api': {
        target: process.env.API_HTTP || process.env.API_HTTPS,
        changeOrigin: true
      },
      '/health': {
        target: process.env.API_HTTP || process.env.API_HTTPS,
        changeOrigin: true
      },
      '/openapi.json': {
        target: process.env.API_HTTP || process.env.API_HTTPS,
        changeOrigin: true
      },
      '/reference': {
        target: process.env.API_HTTP || process.env.API_HTTPS,
        changeOrigin: true
      }
    }
  }
});
