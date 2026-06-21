/**
 * Testes do callback de CORS do Socket.IO.
 *
 * Garante que a política por NODE_ENV está correta:
 *   - development → allowlist restrita (localhost/Vite)
 *   - staging, production, test → qualquer origin (mesmo nginx)
 *   - sem header Origin → sempre permitido (curl, same-origin sem header)
 *
 * Regressão: antes, staging caía em `isDev=true` (NODE_ENV !== 'production'),
 * o que bloqueava o handshake do WebSocket em produção e staging.
 */
import { describe, it, expect } from 'vitest';
import { buildSocketCorsOrigin } from '../../sockets/cors.js';

type Cb = Parameters<ReturnType<typeof buildSocketCorsOrigin>>[1];

function run(env: string | undefined, origin: string | undefined): Promise<{ err: Error | null; ok: boolean | undefined }> {
  return new Promise((resolve) => {
    const cb: Cb = (err, ok) => resolve({ err, ok });
    buildSocketCorsOrigin(env)(origin, cb);
  });
}

describe('sockets/cors', () => {
  describe('development', () => {
    const env = 'development';

    it('permite origin do Vite (localhost:5173)', async () => {
      const { err, ok } = await run(env, 'http://localhost:5173');
      expect(err).toBeNull();
      expect(ok).toBe(true);
    });

    it('permite origin do frontend de dev (localhost:3001)', async () => {
      const { err, ok } = await run(env, 'http://localhost:3001');
      expect(err).toBeNull();
      expect(ok).toBe(true);
    });

    it('permite origin em 127.0.0.1', async () => {
      const { err, ok } = await run(env, 'http://127.0.0.1:5173');
      expect(err).toBeNull();
      expect(ok).toBe(true);
    });

    it('rejeita origin externa (HTTPS staging)', async () => {
      const { err, ok } = await run(env, 'https://stg.chilliplay.com.br');
      expect(ok).toBeFalsy();
      expect(err?.message).toMatch(/Origin não permitido/);
    });

    it('rejeita origin externa (HTTP)', async () => {
      const { err, ok } = await run(env, 'http://evil.example.com');
      expect(ok).toBeFalsy();
      expect(err?.message).toMatch(/Origin não permitido/);
    });

    it('permite request sem header Origin (curl, same-origin)', async () => {
      const { err, ok } = await run(env, undefined);
      expect(err).toBeNull();
      expect(ok).toBe(true);
    });
  });

  describe('staging', () => {
    const env = 'staging';

    it('permite origin HTTPS do staging (regressão: antes bloqueava)', async () => {
      const { err, ok } = await run(env, 'https://stg.chilliplay.com.br');
      expect(err).toBeNull();
      expect(ok).toBe(true);
    });

    it('permite origin HTTPS com porta (8443)', async () => {
      const { err, ok } = await run(env, 'https://stg.chilliplay.com.br:8443');
      expect(err).toBeNull();
      expect(ok).toBe(true);
    });

    it('permite qualquer origin externa (atrás do nginx, same-origin)', async () => {
      const { err, ok } = await run(env, 'https://outro-host.example.com');
      expect(err).toBeNull();
      expect(ok).toBe(true);
    });

    it('permite request sem header Origin', async () => {
      const { err, ok } = await run(env, undefined);
      expect(err).toBeNull();
      expect(ok).toBe(true);
    });
  });

  describe('production', () => {
    const env = 'production';

    it('permite origin HTTPS de prod', async () => {
      const { err, ok } = await run(env, 'https://chilliplay.com.br');
      expect(err).toBeNull();
      expect(ok).toBe(true);
    });

    it('permite request sem header Origin', async () => {
      const { err, ok } = await run(env, undefined);
      expect(err).toBeNull();
      expect(ok).toBe(true);
    });
  });

  describe('test', () => {
    it('trata como prod-like (não bloqueia)', async () => {
      const { err, ok } = await run('test', 'http://qualquer-coisa');
      expect(err).toBeNull();
      expect(ok).toBe(true);
    });
  });

  describe('NODE_ENV indefinido', () => {
    it('trata como não-dev (não bloqueia)', async () => {
      const { err, ok } = await run(undefined, 'https://algo.example.com');
      expect(err).toBeNull();
      expect(ok).toBe(true);
    });
  });
});
