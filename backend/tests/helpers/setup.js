import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach } from 'vitest';

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
});

// Wipe collections between tests to guarantee state isolation
afterEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const { collections } = mongoose.connection;
    for (const key of Object.keys(collections)) {
      await collections[key].deleteMany({});
    }
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});
