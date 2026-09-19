import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

// Liveness/readiness probe. `db` reflects the mongoose connection state
// (1 === connected) so a caller can tell "server up" from "server up + DB up".
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    dbHost: mongoose.connection.readyState === 1 ? mongoose.connection.host : null,
    timestamp: new Date().toISOString(),
  });
});

export default router;
