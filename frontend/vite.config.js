import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    // Serve index.html for all routes (SPA fallback)
    appType: 'spa',
    build: {
      chunkSizeWarningLimit: 2000,
    },
    // Unit tests live beside their source in src/. `e2e/` is Playwright's and
    // must stay out of vitest's reach — those specs use Playwright's own
    // `test.use()` API and fail to even collect under vitest.
    test: {
      include: ['src/**/*.{test,spec}.{js,jsx}'],
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
      environment: 'node',
    },
  };
});