/**
 * Helpers de banco para testes.
 * Importa o pool "de verdade" — testes que dependem de DB só rodam com Postgres no ar.
 */
import type { Pool } from 'pg';
import { getPool, closePool } from '../../database/connection.js';

const TABLES = [
  'map_tokens',
  'maps',
  'characters',
  'messages',
  'dice_rolls',
  'room_members',
  'rooms',
  'users',
] as const;

export async function truncateAll(pool: Pool = getPool()): Promise<void> {
  // RESTART IDENTITY limpa sequences; CASCADE cobre FKs
  await pool.query(`TRUNCATE TABLE ${TABLES.join(', ')} RESTART IDENTITY CASCADE`);
}

export { getPool, closePool };
