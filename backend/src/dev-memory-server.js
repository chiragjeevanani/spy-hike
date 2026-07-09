// Zero-setup dev/e2e server: boots the real Express app against an ephemeral
// in-memory MongoDB (no Atlas needed) and seeds the demo accounts. Handy for
// local end-to-end runs and for anyone who wants to try the full stack
// without provisioning a database.
//
//   node src/dev-memory-server.js         (defaults to PORT 4000)
//
// Data is wiped when the process exits — this is NOT for real persistence;
// use `npm start` (server.js + Atlas) for that.
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { upsertUser, upsertOrganizers, upsertAdmin, upsertCategories, upsertTrips } from './seed.js';

async function start() {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  console.log('✓ In-memory MongoDB started');

  await upsertUser();
  await upsertOrganizers();
  await upsertAdmin();
  await upsertCategories();
  await upsertTrips();
  console.log('✓ Demo accounts + trip catalog seeded');

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`✓ Trekigo API (in-memory) on http://localhost:${env.port}`);
  });

  const shutdown = async () => {
    server.close();
    await mongoose.connection.close();
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('✗ Failed to start in-memory server:', err);
  process.exit(1);
});
