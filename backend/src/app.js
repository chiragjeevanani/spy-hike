import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

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
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.use(async (req, res, next) => {
    if (req.path.startsWith('/api/v1/admin') || req.path.includes('/admin')) {
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

  app.use('/api/v1', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
