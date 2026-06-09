/**
 * Loga método, path, status, duração e requestId após o response terminar.
 * Usa o logger Pino central; em produção vira JSON estruturado.
 */
import type { NextFunction, Request, Response } from 'express';
import { logger } from '../utils/logger.js';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    logger.info(
      {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
        requestId: req.id,
      },
      'request',
    );
  });
  next();
}
