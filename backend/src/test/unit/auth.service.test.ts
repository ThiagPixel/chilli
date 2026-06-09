import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { getPool, closePool, truncateAll } from '../helpers/db.js';
import { signIn, getMeById } from '../../services/auth.service.js';
import { verifyToken } from '../../utils/jwt.js';
import { ValidationError } from '../../utils/errors.js';
import type { Pool } from 'pg';

let pool: Pool;
let dbAvailable = false;

beforeAll(async () => {
  pool = getPool();
  try {
    await pool.query('SELECT 1');
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
});

afterAll(async () => {
  if (dbAvailable) await closePool();
});

const itDb = (name: string, fn: () => Promise<void>): void =>
  it(name, async () => {
    if (!dbAvailable) {
      console.warn('[skip] Postgres indisponível — defina DATABASE_URL');
      return;
    }
    await fn();
  });

describe('auth.service', () => {
  beforeEach(async () => {
    if (dbAvailable) await truncateAll(pool);
  });

  itDb('signIn cria user novo quando email é novo', async () => {
    const { user, token, isNew } = await signIn(pool, {
      name: 'Alice',
      email: 'alice@example.com',
    });

    expect(isNew).toBe(true);
    expect(user.name).toBe('Alice');
    expect(user.email).toBe('alice@example.com');
    expect(user.avatarUrl).toBeNull();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });

  itDb('signIn retorna user existente quando email repete', async () => {
    const first = await signIn(pool, { name: 'Alice', email: 'alice@example.com' });
    const second = await signIn(pool, { name: 'Alice2', email: 'alice@example.com' });

    expect(second.isNew).toBe(false);
    expect(second.user.id).toBe(first.user.id);
    // name original é preservado (signIn não atualiza)
    expect(second.user.name).toBe('Alice');
  });

  itDb('signIn sem email cria user com email null', async () => {
    const { user, isNew } = await signIn(pool, { name: 'Bob' });
    expect(isNew).toBe(true);
    expect(user.email).toBeNull();
  });

  itDb('token retornado é verificável e tem sub correto', async () => {
    const { user, token } = await signIn(pool, { name: 'Bob', email: 'bob@example.com' });

    const payload = verifyToken(token);
    expect(payload.sub).toBe(user.id);
  });

  itDb('rejeita name vazio', async () => {
    await expect(signIn(pool, { name: '   ', email: 'x@x.com' })).rejects.toBeInstanceOf(ValidationError);
  });

  itDb('rejeita name maior que 50', async () => {
    const big = 'a'.repeat(51);
    await expect(signIn(pool, { name: big, email: 'x@x.com' })).rejects.toBeInstanceOf(ValidationError);
  });

  itDb('rejeita email inválido', async () => {
    await expect(signIn(pool, { name: 'X', email: 'not-an-email' })).rejects.toBeInstanceOf(ValidationError);
  });

  itDb('getMeById retorna user existente', async () => {
    const { user } = await signIn(pool, { name: 'M' });
    const fetched = await getMeById(pool, user.id);
    expect(fetched.id).toBe(user.id);
  });

  itDb('getMeById em id inexistente lança ValidationError', async () => {
    await expect(getMeById(pool, '00000000-0000-0000-0000-000000000000')).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
