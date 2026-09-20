import http from 'http';
import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { upsertAdmin } from './seed.js';
import { initCache, closeCache } from './lib/cache.js';
import { initSocket } from './lib/socket.js';
import mongoose from 'mongoose';

import Notification from './models/Notification.js';
import { purgeExpiredNotifications } from './services/notificationService.js';

async function start() {
  const app = createApp();
  let retries = 0;
  const maxRetries = 10;

  function listen() {
    const httpServer = http.createServer(app);
    initSocket(httpServer);

    const server = httpServer.listen(env.port, () => {
      console.log(`✓ Find Your Trek API + WebSockets listening on http://localhost:${env.port} (${env.nodeEnv})`);
      connectDB()
        .then(async (conn) => {
          console.log(`✓ MongoDB connected to ${conn.host}:${conn.port}/${conn.name}`);
          await upsertAdmin();
          // Register 30-day TTL index and compound query indexes on MongoDB
          Notification.syncIndexes().catch((err) => console.warn('[notifications] syncIndexes warning:', err.message));
          // Immediately purge any stale notifications older than 30 days to keep cluster storage optimal
          purgeExpiredNotifications(30).catch((err) => console.warn('[notifications] initial purge warning:', err.message));
        })
        .catch((err) => console.error('✗ MongoDB connection failed:', err.message));

      // Periodic 24-hour maintenance safeguard for MongoDB free cluster
      const DAY_MS = 24 * 60 * 60 * 1000;
      setInterval(() => {
        purgeExpiredNotifications(30).catch((err) => console.warn('[notifications] periodic purge warning:', err.message));
      }, DAY_MS).unref();

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

  process.on('unhandledRejection', (reason, promise) => {
    console.error('[server] Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('[server] Uncaught Exception:', err);
  });

  listen();
}

start();
