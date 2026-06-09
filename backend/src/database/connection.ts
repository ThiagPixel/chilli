/**
 * Pool de conexões PostgreSQL (singleton).
 * Exporta `getPool()`, `query<T>()` e `withTx()`.
 */
import pg from 'pg';
import { loadEnv } from '../config/env.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;
type PoolType = pg.Pool;

let pool: PoolType | null = null;

export function getPool(): PoolType {
  if (pool) return pool;
  const env = loadEnv();

  pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  pool.on('error', (err) => {
    logger.error({ err }, 'pg pool error');
  });

  logger.info('pg pool criado');
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    logger.info('pg pool encerrado');
  }
}

/** Helper de query com tipagem genérica. */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: ReadonlyArray<unknown>,
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params as unknown[]);
}

/** Executa `fn` dentro de uma transação. */
export async function withTx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
