import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { upsertAdmin } from './seed.js';
import { initCache, closeCache } from './lib/cache.js';
import mongoose from 'mongoose';

async function start() {
  const app = createApp();
  let retries = 0;
  const maxRetries = 10;

  function listen() {
    const server = app.listen(env.port, () => {
      console.log(`✓ Find Your Trek API listening on http://localhost:${env.port} (${env.nodeEnv})`);
      connectDB()
        .then(async () => {
          console.log('✓ MongoDB connected');
          await upsertAdmin();
        })
        .catch((err) => console.error('✗ MongoDB connection failed:', err.message));
      // Never awaited: a missing or slow Redis must not hold up the API, which
      // serves fine from the in-memory fallback until this resolves.
      initCache().catch((err) => console.warn('[cache] init failed:', err.message));
    });

    // PM2 reloads send SIGINT/SIGTERM — close the Redis socket so the old
    // process can exit instead of lingering on an open connection.
    for (const signal of ['SIGINT', 'SIGTERM']) {
      process.once(signal, async () => {
        await closeCache();
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(0), 3000).unref();
      });
    }

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE' && retries < maxRetries) {
        retries++;
        console.log(`Port ${env.port} is busy (retry ${retries}/${maxRetries}), retrying in 300ms...`);
        setTimeout(() => {
          try {
            server.close();
          } catch (e) {}
          listen();
        }, 300);
      } else {
        console.error('✗ Server error:', err.message);
        process.exit(1);
      }
    });
  }

  listen();
}

start();
