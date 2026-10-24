import { defineConfig } from 'vite';
import { validatePackageMarkup } from './src/packages';

export default defineConfig({
  base: '/inside-aspire/',
  plugins: [{
    name: 'validate-package-annotations',
    transformIndexHtml(html) {
      validatePackageMarkup(html);
      return html;
    },
  }],
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
