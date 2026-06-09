/**
 * Bootstrap do servidor HTTP.
 *
 * - Carrega env
 * - Cria app via factory
 * - Inicia listening
 * - Encerramento gracioso (SIGINT/SIGTERM) fecha o server e o pool Postgres
 */
import { loadEnv } from './config/env.js';
import { createApp } from './app.js';
import { closePool } from './database/connection.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  const env = loadEnv();
  logger.info({ env: env.NODE_ENV, port: env.PORT }, 'iniciando backend');

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'http server listening');
  });

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
