import { defineConfig } from '@playwright/test';

// Dedicated port + --strictPort so this never silently attaches to (or
// collides with) a dev server someone already has running on 5173.
const PORT = 5183;

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
  webServer: {
    command: `npx vite --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
