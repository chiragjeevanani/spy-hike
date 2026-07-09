import { defineConfig } from '@playwright/test';

// Dedicated port + --strictPort so this never silently attaches to (or
// collides with) a dev server someone already has running on 5173.
const PORT = 5183;
// Backend for auth-backed flows. Runs the API against an ephemeral in-memory
// MongoDB (no Atlas needed) with the demo accounts seeded — see
// backend/src/dev-memory-server.js. CORS is opened to the e2e vite origin.
const API_PORT = 4000;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // specs share localStorage-seeding conventions; keep runs predictable
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: `cd ../backend && CORS_ORIGINS=http://localhost:${PORT} PORT=${API_PORT} node src/dev-memory-server.js`,
      port: API_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000, // mongodb-memory-server may download its binary on first run
    },
    {
      command: `npx vite --port ${PORT} --strictPort`,
      port: PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
});
