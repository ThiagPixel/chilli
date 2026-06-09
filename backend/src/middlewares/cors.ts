/**
 * CORS manual para dev.
 *
 * Em produção, o frontend e o backend ficam atrás do mesmo Nginx
 * (mesmo origin) — não precisa deste middleware. Em dev o frontend
 * roda em :5173/:3001 e o backend em :3000, então habilitamos
 * cross-origin + credentials (cookies httpOnly sobem).
 */
import type { NextFunction, Request, Response } from 'express';

const ALLOWED_ORIGINS = new Set<string>([
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
]);

export function corsDev(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Request-Id',
  );
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PATCH,DELETE,OPTIONS',
  );
  res.setHeader('Access-Control-Max-Age', '600');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
}
