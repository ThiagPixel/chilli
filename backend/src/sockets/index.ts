/**
 * Bootstrap do servidor Socket.IO.
 *
 * - Anexa em um `httpServer` já criado pelo `server.ts`.
 * - Política de CORS vive em `./cors.ts` (decide por NODE_ENV).
 * - Middleware de auth exige cookie `chilli_token` válido.
 * - Despacha os handlers por namespace (default `/`).
 */
import { Server, type Server as IoServer } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { socketAuth } from './auth.js';
import { buildSocketCorsOrigin } from './cors.js';
import { registerRoomHandlers } from './handlers/room.handler.js';
import { registerChatHandlers } from './handlers/chat.handler.js';
import { registerDiceHandlers } from './handlers/dice.handler.js';
import { registerMapHandlers } from './handlers/map.handler.js';
import { registerMapTokenHandlers } from './handlers/mapToken.handler.js';
import { registerTurnHandlers } from './handlers/turn.handler.js';
import { setIO } from './ioRef.js';
import { logger } from '../utils/logger.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../types/socket-events.js';

export type ChilliIo = IoServer<ClientToServerEvents, ServerToClientEvents>;

export function attachSocketServer(httpServer: HttpServer): ChilliIo {
  const io: ChilliIo = new Server(httpServer, {
    cors: {
      origin: buildSocketCorsOrigin(process.env['NODE_ENV']),
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
    registerMapTokenHandlers(io, socket);
    registerTurnHandlers(io, socket);
  });

  logger.info('socket.io anexado');
  setIO(io);
  return io;
}
