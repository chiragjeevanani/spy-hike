import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod;

export async function setup() {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_URI = uri;
  globalThis.__MONGOD__ = mongod;
}

export async function teardown() {
  if (globalThis.__MONGOD__) {
    await globalThis.__MONGOD__.stop();
  }
}
