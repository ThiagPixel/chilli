/**
 * Auth middleware para Socket.IO.
 *
 * Lê o cookie `chilli_token` do header HTTP do handshake e popula
 * `socket.data.userId`. Conexões sem token válido são recusadas com
 * `next(new Error('UNAUTHORIZED'))`, o que faz o client receber
 * um erro de handshake e não conseguir conectar.
 */
import type { Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';

export const AUTH_COOKIE_NAME = 'chilli_token';

export interface SocketData {
  userId: string;
}

/** Faz parse do header `Cookie` em um mapa simples. */
function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

/**
 * Middleware Socket.IO: exige cookie JWT válido. Em sucesso,
 * popula `socket.data.userId`. Em falha, recusa a conexão.
 */
export function socketAuth(socket: Socket, next: (err?: Error) => void): void {
  const cookies = parseCookieHeader(socket.handshake.headers.cookie);
  const token = cookies[AUTH_COOKIE_NAME] ?? null;
  if (!token) {
    next(new Error('UNAUTHORIZED'));
    return;
  }
  try {
    const payload = verifyToken(token);
    (socket.data as SocketData).userId = payload.sub;
    next();
  } catch {
    next(new Error('UNAUTHORIZED'));
  }
}

/** Helper para o código que precisa do userId com tipagem estrita. */
export function getUserId(socket: Socket): string {
  const data = socket.data as Partial<SocketData>;
  if (!data.userId) throw new Error('socket sem userId — middleware de auth não rodou');
  return data.userId;
}
