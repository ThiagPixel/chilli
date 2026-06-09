/**
 * Teste do /health usando supertest. Não precisa de DB — se o DB
 * estiver down, o handler ainda responde 503 com `status: 'degraded'`.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Server } from 'node:http';
import { createApp } from '../../app.js';
import { getPool } from '../helpers/db.js';

let app: ReturnType<typeof createApp>;
let server: Server;

beforeAll(() => {
  app = createApp();
  server = app.listen(0); // porta aleatória
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  try {
    const pool = getPool();
    await pool.end();
  } catch {
    // pool pode nem ter sido aberto
  }
});

describe('GET /health', () => {
  it('retorna 200 com db ok OU 503 com db down', async () => {
    const res = await request(server).get('/health');
    expect([200, 503]).toContain(res.status);

    if (res.status === 200) {
      expect(res.body.status).toBe('ok');
      expect(res.body.db).toBe('ok');
    } else {
      expect(res.body.status).toBe('degraded');
      expect(res.body.db).toBe('down');
    }

    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('env');
  });

  it('sempre ecoa o header X-Request-Id', async () => {
    const res = await request(server).get('/health');
    expect(res.headers['x-request-id']).toBeDefined();
    expect(typeof res.headers['x-request-id']).toBe('string');
  });

  it('aceita X-Request-Id inbound', async () => {
    const res = await request(server)
      .get('/health')
      .set('X-Request-Id', 'test-123');
    expect(res.headers['x-request-id']).toBe('test-123');
  });
});
