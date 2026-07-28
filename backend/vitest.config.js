import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/helpers/setup.js'],
    fileParallelism: false, // Run test files sequentially so a single lightweight Mongo instance is reused
    testTimeout: 15000,
    hookTimeout: 15000,
    globals: true,
  },
});
