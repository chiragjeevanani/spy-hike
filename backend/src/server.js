import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

// Real process entry point: connect to Atlas, then start listening.
async function start() {
  try {
    await connectDB();
    console.log('✓ MongoDB connected');

    const app = createApp();
    app.listen(env.port, () => {
      console.log(`✓ Trekigo API listening on http://localhost:${env.port} (${env.nodeEnv})`);
    });
  } catch (err) {
    console.error('✗ Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
