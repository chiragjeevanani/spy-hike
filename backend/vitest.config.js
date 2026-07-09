import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Each test file gets a fresh in-memory Mongo via tests/helpers/setup.js.
    setupFiles: ['./tests/helpers/setup.js'],
    // mongodb-memory-server downloads a binary on first run; give it room.
    testTimeout: 30000,
    hookTimeout: 60000,
    globals: true,
  },
});
