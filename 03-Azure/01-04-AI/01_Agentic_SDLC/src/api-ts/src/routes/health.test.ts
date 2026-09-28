import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import healthRouter from './health';

const { databaseQuery, getDatabase } = vi.hoisted(() => ({
  databaseQuery: vi.fn(),
  getDatabase: vi.fn(),
}));

vi.mock('../db/sqlite', () => ({
  getDatabase,
}));

const app = express();
app.use('/health', healthRouter);

describe('Health API', () => {
  beforeEach(() => {
    delete process.env.SIMULATE_DEPENDENCY_FAILURE;
    databaseQuery.mockResolvedValue({ result: 1 });
    getDatabase.mockResolvedValue({ get: databaseQuery });
  });

  afterEach(() => {
    delete process.env.SIMULATE_DEPENDENCY_FAILURE;
    vi.clearAllMocks();
  });

  it('reports the process as live', async () => {
    const response = await request(app).get('/health/live');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('reports ready when the database is reachable', async () => {
    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ready',
      checks: {
        database: 'ok',
      },
    });
    expect(databaseQuery).toHaveBeenCalledWith('SELECT 1');
  });

  it('reports not ready when the dependency fault is enabled', async () => {
    process.env.SIMULATE_DEPENDENCY_FAILURE = 'true';

    const response = await request(app).get('/health/ready');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      status: 'not_ready',
      checks: {
        database: 'failed',
      },
    });
  });
});
