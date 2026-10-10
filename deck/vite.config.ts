import { defineConfig } from 'vite';

export default defineConfig({
  base: '/inside-aspire/',
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
