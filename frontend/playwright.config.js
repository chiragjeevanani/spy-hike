import { defineConfig } from '@playwright/test';

// Dedicated port + --strictPort so this never silently attaches to (or
// collides with) a dev server someone already has running on 5173.
const PORT = 5183;
// Backend for auth-backed flows: an isolated MongoDB with test-only account
// and catalog fixtures. SMS, payments and push cannot use live credentials.
const API_PORT = 4000;

// All browser specs share deterministic test-only credentials.
process.env.ADMIN_EMAIL = 'admin@findyourtrek.com';
process.env.ADMIN_PASSWORD = 'admin123';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // specs share localStorage-seeding conventions; keep runs predictable
  // One worker: all specs share a single in-memory backend, and a few mutate
  // singletons (loyalty/commission config). Serial execution keeps runs
  // deterministic.
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      // Never reuse a developer server: it may point at real data/gateways.
      command: `cd ../backend && CORS_ORIGINS=http://localhost:${PORT} PORT=${API_PORT} node tests/helpers/e2e-server.js`,
      port: API_PORT,
      reuseExistingServer: false,
      timeout: 120_000, // mongodb-memory-server may download its binary on first run
    },
    {
      command: `DISABLE_HMR=true VITE_API_BASE_URL=http://localhost:${API_PORT}/api/v1 npx vite --port ${PORT} --strictPort`,
      port: PORT,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
