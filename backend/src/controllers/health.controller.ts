/**
 * Health check.
 *
 * - 200 + `status: 'ok'`       → app e DB operacionais.
 * - 503 + `status: 'degraded'` → app responde, mas DB indisponível.
 *
 * Não exige autenticação (probes de infraestrutura).
 */
import { Router } from 'express';
import { getPool } from '../database/connection.js';
import { logger } from '../utils/logger.js';

export const healthRouter = Router();

interface HealthResponse {
  status: 'ok' | 'degraded';
  uptime: number;
  db: 'ok' | 'down';
  timestamp: string;
  env: string;
}

healthRouter.get('/', async (req, res) => {
  let dbStatus: 'ok' | 'down' = 'ok';
  try {
    await getPool().query('SELECT 1');
  } catch (err) {
    dbStatus = 'down';
    logger.warn({ err, requestId: req.id }, 'health: db indisponível');
  }

  const body: HealthResponse = {
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    uptime: Math.round(process.uptime()),
    db: dbStatus,
    timestamp: new Date().toISOString(),
    env: process.env['NODE_ENV'] ?? 'development',
  };

  res.status(dbStatus === 'ok' ? 200 : 503).json(body);
});
