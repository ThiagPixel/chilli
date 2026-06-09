/**
 * requireAuth — extrai o userId do JWT.
 *
 * Ordem de leitura:
 *   1. Cookie httpOnly `chilli_token` (preferido).
 *   2. Header `Authorization: Bearer <token>` (fallback).
 *
 * Em sucesso, popula `req.userId` e chama `next()`.
 * Em falha, responde 401 com `code: 'UNAUTHORIZED'`.
 */
import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { UnauthorizedError } from '../utils/errors.js';

const COOKIE_NAME = 'chilli_token';

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const token = readToken(req);
  if (!token) {
    next(new UnauthorizedError('Token ausente'));
    return;
  }
  try {
    const payload = verifyToken(token);
    req.userId = payload.sub;
    next();
  } catch {
    next(new UnauthorizedError('Token inválido ou expirado'));
  }
}

function readToken(req: Request): string | null {
  // 1) cookie
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  if (cookies && typeof cookies[COOKIE_NAME] === 'string' && cookies[COOKIE_NAME]) {
    return cookies[COOKIE_NAME] ?? null;
  }
  // 2) header
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const t = header.slice('Bearer '.length).trim();
    return t || null;
  }
  return null;
}

export const AUTH_COOKIE_NAME = COOKIE_NAME;
