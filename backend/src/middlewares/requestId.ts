/**
 * Atribui um `X-Request-Id` (UUID) a cada request e o ecoa no response.
 * O id fica disponível em `req.id` para os demais middlewares/controllers
 * e nos logs estruturados.
 */
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header('X-Request-Id');
  const id = incoming && incoming.length <= 128 ? incoming : randomUUID();
  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
