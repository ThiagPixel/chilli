/**
 * Bootstrap do servidor HTTP.
 *
 * - Carrega env
 * - Cria app via factory
 * - Inicia listening
 * - Anexa Socket.IO no mesmo `httpServer` (mesma porta, `/socket.io`)
 * - Encerramento gracioso (SIGINT/SIGTERM) fecha o server e o pool Postgres
 */
import { loadEnv } from './config/env.js';
import { createApp } from './app.js';
import { closePool } from './database/connection.js';
import { runMigrations } from './database/migrate.js';
import { attachSocketServer } from './sockets/index.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  const env = loadEnv();
  logger.info({ env: env.NODE_ENV, port: env.PORT }, 'iniciando backend');

  // Migrations no boot (ARCHITECTURE.md §8.5).
  // Falha aqui = container reinicia. Aceitável para o MVP: fail fast,
  // visível em `docker logs`, e reversível com restore de backup.
  try {
    const { applied, skipped } = await runMigrations();
    if (applied.length === 0) {
      logger.info({ skipped: skipped.length }, 'migrations já aplicadas — schema em dia');
    } else {
      logger.info(
        { applied, skipped: skipped.length },
        'migrations aplicadas no boot',
      );
    }
  } catch (err) {
    logger.fatal({ err }, 'falha ao aplicar migrations — abortando boot');
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'http server listening');
  });

  // Anexa Socket.IO no mesmo http server (mesma porta).
  attachSocketServer(server);

  server.on('error', (err) => {
    logger.error({ err }, 'falha ao iniciar http server');
    process.exit(1);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'shutdown iniciado');
    server.close((err) => {
      if (err) logger.error({ err }, 'erro ao fechar http server');
      else logger.info('http server fechado');
    });
    try {
      await closePool();
    } catch (err) {
      logger.error({ err }, 'erro ao fechar pg pool');
    }
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void main();
