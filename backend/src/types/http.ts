/**
 * Tipos auxiliares para a camada HTTP.
 *
 * `Request.id` é injetado pelo middleware `requestId` e fica disponível
 * em todos os controllers e middlewares via `req.id`.
 */
import 'express';

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export {};
