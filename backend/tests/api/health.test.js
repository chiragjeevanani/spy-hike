import { describe, it, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';

const app = createApp();

describe('GET /api/v1/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('reports the database as connected (in-memory Mongo from the test harness)', async () => {
    // The setup helper connects mongoose before tests run.
    expect(mongoose.connection.readyState).toBe(1);
    const res = await request(app).get('/api/v1/health');
    expect(res.body.db).toBe('connected');
  });
});

describe('404 handling', () => {
  it('returns a JSON error body for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.error).toBeTruthy();
    expect(res.body.error.message).toMatch(/not found/i);
  });
});
