import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import { cacheInvalidate } from './lib/cache.js';
import { PAYU_WEBHOOK_PATH, PAYU_RETURN_PATH } from './integrations/payments.js';

// Which cached prefixes a successful write can invalidate. Applied centrally
// rather than per-controller: a mutation route added later is covered by
// default, whereas a forgotten cacheInvalidate() call would serve stale data
// silently — the worse failure of the two.
const INVALIDATION_MAP = [
  // Editing a trek syncs its identity fields into every trip beneath it, so
  // both families go.
  [/\/treks/, ['treks', 'trips']],
  [/\/trips/, ['trips']],
  // Booking or cancelling moves seat counts, which ride along on trip records.
  [/\/bookings/, ['trips']],
  [/\/categories/, ['categories', 'trips']],
  [/\/(landing|site|onboarding)-content|\/promotional-banners/, ['content']],
  // Promoting/unpromoting an organizer (directly or via a request approval)
  // rewrites the `organizer.promotedUntil` snapshot on every trip they've
  // posted — the same cached "trips" prefix those trips' list/offer pages
  // live under.
  [/\/organizers\/[^/]+\/(un)?promote/, ['trips']],
  [/\/promotion-requests/, ['trips']],
];

const prefixesFor = (path) =>
  [...new Set(INVALIDATION_MAP.filter(([re]) => re.test(path)).flatMap(([, p]) => p))];

// Builds the Express app WITHOUT starting a listener, so tests can import it
// and drive it with Supertest while server.js owns the actual `listen`.
export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin/non-browser requests (no Origin header) and any
        // explicitly whitelisted dev origin.
        if (!origin || env.corsOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '50mb' })); // base64 image uploads can be large
  // PayU's return post and webhooks are form-encoded; their hash is computed
  // over individual field values, so the parsed body is all verification needs.
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.use(async (req, res, next) => {
    // Admins still need in during maintenance, and so do gateway callbacks: a
    // 503 to PayU (or to a customer returning from it) is a lost result, and a
    // payment that was taken but never confirmed here is the worst outcome
    // maintenance mode can produce.
    if (req.path.startsWith('/api/v1/admin') || req.path.includes('/admin')
      || req.path === PAYU_WEBHOOK_PATH || req.path === PAYU_RETURN_PATH) {
      return next();
    }
    try {
      const { getConfig } = await import('./models/AdminConfig.js');
      const cfg = await getConfig();
      if (cfg.maintenanceMode) {
        return res.status(503).json({
          error: {
            status: 503,
            message: 'System is undergoing scheduled maintenance. Please try again later.',
          }
        });
      }
    } catch (e) {}
    next();
  });

  // Evict cached public views once a write has actually succeeded. Runs on
  // 'finish' so a rejected or failed mutation never clears a warm cache.
  app.use((req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      const prefixes = prefixesFor(req.path);
      if (prefixes.length) cacheInvalidate(...prefixes).catch(() => {});
    });
    return next();
  });

  app.use('/api/v1', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
