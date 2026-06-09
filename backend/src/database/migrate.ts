/**
 * Runner de migrations.
 * - Lê `migrations/*.sql` em ordem lexicográfica.
 * - Mantém tabela `_migrations` registrando as aplicadas.
 * - Aplica cada uma em uma transação.
 *
 * Uso:
 *   $ npm run db:migrate
 */
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { closePool, query, withTx } from './connection.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MIGRATIONS_DIR = join(__dirname, 'migrations');

async function ensureMigrationsTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          SERIAL PRIMARY KEY,
      name        TEXT NOT NULL UNIQUE,
      applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function getApplied(): Promise<Set<string>> {
  const res = await query<{ name: string }>('SELECT name FROM _migrations');
  return new Set(res.rows.map((r) => r.name));
}

async function listMigrationFiles(): Promise<string[]> {
  const files = await readdir(MIGRATIONS_DIR);
  return files.filter((f) => f.endsWith('.sql')).sort();
}

export async function runMigrations(): Promise<{ applied: string[]; skipped: string[] }> {
  await ensureMigrationsTable();
  const applied = await getApplied();
  const files = await listMigrationFiles();
  const justApplied: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    if (applied.has(file)) {
      skipped.push(file);
      continue;
    }
    const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
    await withTx(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
    });
    justApplied.push(file);
    logger.info({ migration: file }, 'migration aplicada');
  }

  return { applied: justApplied, skipped };
}

async function main(): Promise<void> {
  try {
    const result = await runMigrations();
    if (result.applied.length === 0) {
      logger.info({ skipped: result.skipped }, 'nenhuma migration nova; banco já atualizado');
    } else {
      logger.info(
        { applied: result.applied, skipped: result.skipped },
        'migrations finalizadas',
      );
    }
  } catch (err) {
    logger.error({ err }, 'falha ao aplicar migrations');
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

// Executa quando chamado via CLI (`tsx src/database/migrate.ts`).
// Não executa em `import` para permitir uso em testes.
const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  void main();
}
