/**
 * Converte erros em resposta JSON padronizada.
 *
 * - `AppError` (e subclasses) → usa `statusCode` e `code` do erro.
 * - Qualquer outro erro      → 500 com `code: 'INTERNAL'` (logado).
 *
 * Sempre inclui o `X-Request-Id` no body para correlação com logs.
 */
import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { ApiErrorBody } from '../types/http.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const body: ApiErrorBody = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  // Erro não-tipado: loga com stack para investigação.
  logger.error(
    { err, requestId: req.id, method: req.method, path: req.originalUrl },
    'unhandled error',
  );
  const body: ApiErrorBody = {
    error: {
      code: 'INTERNAL',
      message: 'Erro interno do servidor',
    },
  };
  res.status(500).json(body);
}
