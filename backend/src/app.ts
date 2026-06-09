/**
 * Factory do Express.
 *
 * Ordem dos middlewares (de fora pra dentro):
 *   1. CORS dev (manual, sem `cors` package).
 *   2. cookie-parser (lê `chilli_token` no requireAuth).
 *   3. JSON body parser (limite conservador).
 *   4. requestId + requestLogger.
 *   5. /health (sem prefixo — convenção para probes).
 *   6. /api/* → apiRouter.
 *   7. 404 explícito.
 *   8. errorHandler (sempre por último).
 */
import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import { requestId } from './middlewares/requestId.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { corsDev } from './middlewares/cors.js';
import { healthRouter } from './controllers/health.controller.js';
import { apiRouter } from './routes/api.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', true);

  // CORS antes de tudo, inclusive do preflight OPTIONS.
  app.use(corsDev);

  // Cookies httpOnly (chilli_token) precisam do parser.
  app.use(cookieParser());

  // Limite conservador para o MVP; ampliado por rota no passo 3.
  app.use(express.json({ limit: '256kb' }));

  app.use(requestId);
  app.use(requestLogger);

  // Health check (sem prefixo — convenção para probes)
  app.use('/health', healthRouter);

  // API REST versionada
  app.use('/api', apiRouter);

  // 404 explícito
  app.use((req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: `Rota não encontrada: ${req.method} ${req.originalUrl}` },
    });
  });

  app.use(errorHandler);

  return app;
}
