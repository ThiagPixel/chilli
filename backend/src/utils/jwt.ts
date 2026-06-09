/**
 * Helpers de JWT (HS256).
 * `sub` = userId.
 */
import jwt from 'jsonwebtoken';
import { loadEnv } from '../config/env.js';
import { UnauthorizedError } from './errors.js';

export interface JwtPayload {
  sub: string; // userId
  iat?: number;
  exp?: number;
}

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const env = loadEnv();
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload {
  const env = loadEnv();
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !decoded.sub) {
      throw new UnauthorizedError('Token inválido');
    }
    return decoded as JwtPayload;
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError('Token inválido ou expirado');
  }
}
