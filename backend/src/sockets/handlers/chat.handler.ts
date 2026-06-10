/**
 * Handler de chat: `chat:send` recebe uma mensagem, persiste e
 * faz broadcast para todos os membros da sala (incluindo o autor).
 *
 * O `room:join` já entrega o `chat:history` (via `room:state.recentMessages`).
 * O REST `GET /api/rooms/:code/messages` cobre o histórico paginado
 * para reloads.
 */
import type { Server, Socket } from 'socket.io';
import { findRoomByCode } from '../../database/repositories/room.repo.js';
import { postMessage } from '../../services/message.service.js';
import { getUserId } from '../auth.js';
import { pool } from '../room-state.js';
import { logger } from '../../utils/logger.js';
import type { AckResult } from '../../types/socket-events.js';
import type { Message } from '../../types/domain.js';

export function registerChatHandlers(_io: Server, socket: Socket): void {
  socket.on('chat:send', async (payload, ack) => {
    try {
      const body = String(payload?.body ?? '').trim();
      if (!body) {
        ack(ackErr('VALIDATION_ERROR', 'Mensagem vazia'));
        return;
      }
      const code = (socket.data as { roomCode?: string }).roomCode;
      if (!code) {
        ack(ackErr('NOT_JOINED', 'Você não entrou em nenhuma sala'));
        return;
      }

      const userId = getUserId(socket);
      const p = pool();
      const room = await findRoomByCode(p, code);
      if (!room) {
        ack(ackErr('NOT_FOUND', 'Sala não encontrada'));
        return;
      }

      const message = await postMessage(p, { roomId: room.id, userId, content: body });
      // Broadcast para TODOS na sala (incluindo o autor — o autor
      // também precisa ver a própria mensagem via socket, caso esteja
      // em outra aba/clone).
      _io.to(code).emit('chat:message', message);
      ack(ackOk(message));
    } catch (err) {
      logger.error({ err }, 'socket.chat:send falhou');
      ack(ackErr('INTERNAL', err instanceof Error ? err.message : 'Falha ao enviar mensagem'));
    }
  });
}

function ackOk<T>(data: T): AckResult<T> {
  return { ok: true, data };
}
function ackErr(code: string, message: string): AckResult<never> {
  return { ok: false, error: { code, message } };
}
