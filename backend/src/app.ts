/**
 * Factory do Express.
 *
 * Por enquanto monta apenas middlewares globais e o health check.
 * Rotas REST de negócio entram no passo 3 (API).
 */
import express, { type Express } from 'express';
import { requestId } from './middlewares/requestId.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { healthRouter } from './controllers/health.controller.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', true);

  // Limite conservador para o MVP; ampliado por rota no passo 3.
  app.use(express.json({ limit: '256kb' }));

  app.use(requestId);
  app.use(requestLogger);

  // Health check (sem prefixo — convenção para probes)
  app.use('/health', healthRouter);

  // 404 explícito
  app.use((req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Rota não encontrada: ${req.method} ${req.originalUrl}` },
    });
  });

  app.use(errorHandler);

  return app;
}
