import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { cacheInvalidate, closeCache } from '../../src/lib/cache.js';
import { env } from '../../src/config/env.js';

/**
 * Single-instance in-memory MongoDB manager.
 * Spawns ONLY ONE MongoDB binary for the entire test suite run,
 * re-using the connection across test files to eliminate CPU/memory lag.
 */
beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  
  if (!globalThis.__MONGO_URI__) {
    const mongod = await MongoMemoryServer.create();
    globalThis.__MONGO_URI__ = mongod.getUri();
    globalThis.__MONGOD_INSTANCE__ = mongod;
  }
  
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(globalThis.__MONGO_URI__);
  }
}, 60000);

// Every suite starts with the gateway switched off, whatever the developer's
// own .env says. Real PayU credentials in .env would otherwise flip checkout to
// 'online' and turn every booking pending — which is correct behaviour, but it
// silently broke the suites that assert the Pay-on-Arrival flow. The payments
// suite opts into 'online' explicitly in its own beforeEach, which runs after
// this one.
beforeEach(() => {
  env.paymentMode = 'arrival';
  env.payuMerchantKey = '';
  env.payuMerchantSalt = '';
});

// Wipe collections between tests to guarantee state isolation. The response
// cache has to go with them — otherwise a test that warmed an endpoint hands
// the next test a body built from data that no longer exists.
afterEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const { collections } = mongoose.connection;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany({});
    }
  }
  await cacheInvalidate('');
});

afterAll(async () => {
  await closeCache();
});
