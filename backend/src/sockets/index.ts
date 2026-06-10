/**
 * Bootstrap do servidor Socket.IO.
 *
 * - Anexa em um `httpServer` já criado pelo `server.ts`.
 * - Compartilha a config de CORS do Express (mesma allowlist de dev).
 * - Middleware de auth exige cookie `chilli_token` válido.
 * - Despacha os handlers por namespace (default `/`).
 */
import { Server, type Server as IoServer } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { socketAuth } from './auth.js';
import { registerRoomHandlers } from './handlers/room.handler.js';
import { registerChatHandlers } from './handlers/chat.handler.js';
import { registerDiceHandlers } from './handlers/dice.handler.js';
import { registerMapHandlers } from './handlers/map.handler.js';
import { logger } from '../utils/logger.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../types/socket-events.js';

const ALLOWED_ORIGINS = new Set<string>([
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
]);

export type ChilliIo = IoServer<ClientToServerEvents, ServerToClientEvents>;

export function attachSocketServer(httpServer: HttpServer): ChilliIo {
  const isDev = process.env['NODE_ENV'] !== 'production';
  const io: ChilliIo = new Server(httpServer, {
    cors: {
      origin: (origin, cb) => {
        // Sem header `Origin` (ex.: curl) → permite. Com Origin,
        // só permite os da allowlist em dev; em prod, o frontend
        // está no mesmo origin (atrás do Nginx) e o header some.
        if (!origin) {
          cb(null, true);
          return;
        }
        if (isDev && !ALLOWED_ORIGINS.has(origin)) {
          cb(new Error(`Origin não permitido: ${origin}`), false);
          return;
        }
        cb(null, true);
      },
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  io.use(socketAuth);

  io.on('connection', (socket) => {
    const userId = (socket.data as { userId?: string }).userId;
    logger.info({ socketId: socket.id, userId }, 'socket conectado');

    registerRoomHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerDiceHandlers(io, socket);
    registerMapHandlers(io, socket);
  });

  logger.info('socket.io anexado');
  return io;
}
