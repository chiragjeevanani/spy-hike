// Throwaway boot smoke: starts an in-memory Mongo, points the real server
// wiring at it, and confirms /api/v1/health responds 200 with db connected.
// Not part of the Vitest suite — run directly: `node tests/helpers/smoke-server.js`.
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDB } from '../../src/config/db.js';
import { createApp } from '../../src/app.js';

const mongod = await MongoMemoryServer.create();
await connectDB(mongod.getUri());

const app = createApp();
const server = app.listen(4999, async () => {
  try {
    const res = await fetch('http://localhost:4999/api/v1/health');
    const body = await res.json();
    console.log('HEALTH_STATUS', res.status);
    console.log('HEALTH_BODY', JSON.stringify(body));
    if (res.status === 200 && body.status === 'ok' && body.db === 'connected') {
      console.log('SMOKE_OK');
    } else {
      console.log('SMOKE_FAIL');
      process.exitCode = 1;
    }
  } finally {
    server.close();
    await mongod.stop();
    process.exit(process.exitCode || 0);
  }
});
