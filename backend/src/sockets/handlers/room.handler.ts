/**
 * Handlers de sala: `room:join`, `room:leave`, `presence:ping`,
 * e o `disconnect` automático do Socket.IO.
 *
 * Responsabilidades:
 *   - Validar o código (sala existe, usuário é membro).
 *   - Entrar na "room" do Socket.IO (que é a sala = escopo de broadcast).
 *   - Entregar o `RoomState` completo via ack.
 *   - Broadcast `room:user_joined` para os outros.
 *   - Postar mensagem de sistema "X entrou".
 *   - Em disconnect, broadcast leave + mensagem de sistema "X saiu".
 */
import type { Server, Socket } from 'socket.io';
import {
  findRoomByCode,
  clearTurnIfOwner,
} from '../../database/repositories/room.repo.js';
import { findActiveMember } from '../../database/repositories/roomMember.repo.js';
import { findUserById } from '../../database/repositories/user.repo.js';
import { getUserId } from '../auth.js';
import { buildRoomState, pool } from '../room-state.js';
import { postSystemMessage } from '../../services/message.service.js';
import { logger } from '../../utils/logger.js';
import type { AckResult, RoomState } from '../../types/socket-events.js';

export function registerRoomHandlers(io: Server, socket: Socket): void {
  socket.on('room:join', async (payload, ack) => {
    try {
      const code = String(payload?.code ?? '').toUpperCase();
      if (!code) {
        ack(ackErr('VALIDATION_ERROR', 'Código ausente'));
        return;
      }
      const userId = getUserId(socket);
      const p = pool();
      const room = await findRoomByCode(p, code);
      if (!room) {
        ack(ackErr('NOT_FOUND', 'Sala não encontrada'));
        return;
      }
      const member = await findActiveMember(p, room.id, userId);
      if (!member) {
        ack(ackErr('FORBIDDEN', 'Você não é membro desta sala'));
        return;
      }

      // O socket.IO room = roomCode (string curta e estável).
      // Idempotência: se o socket JÁ estava na sala (ex.: React
      // StrictMode re-disparou o effect, ou o cliente reenviou após
      // um erro de rede), não postamos system message nem fazemos
      // broadcast de entrada de novo.
      const alreadyJoined = socket.rooms.has(code);
      await socket.join(code);

      const state = await buildRoomState(p, code);
      (socket.data as { roomCode?: string }).roomCode = code;

      if (alreadyJoined) {
        // Re-ack: só devolvemos o estado (refresh). Sem efeitos colaterais.
        ack(ackOk(state));
        return;
      }

      // Mensagem de sistema + broadcast join (em paralelo, sem bloquear o ack).
      void (async () => {
        try {
          const user = await findUserById(p, userId);
          if (!user) return;
          // 1) Mensagem de sistema persistida + entregue no chat.
          const sysMsg = await postSystemMessage(p, room.id, `${user.name} entrou na sala.`);
          io.to(code).emit('chat:message', sysMsg);
          // 2) Broadcast de entrada (para popular lista de jogadores).
          socket.to(code).emit('room:user_joined', { user, role: member.role });
          logger.info({ code, userId }, 'socket.room.join ok');
        } catch (err) {
          logger.error({ err, code, userId }, 'socket.room.join side-effect falhou');
        }
      })();

      ack(ackOk(state));
    } catch (err) {
      logger.error({ err }, 'socket.room:join falhou');
      ack(ackErr('INTERNAL', err instanceof Error ? err.message : 'Falha ao entrar'));
    }
  });

  socket.on('room:leave', () => {
    const code = (socket.data as { roomCode?: string }).roomCode;
    if (!code) return;
    void handleLeave(io, socket, code);
  });

  socket.on('presence:ping', () => {
    // No-op para o MVP: marca que o cliente está vivo. Reservado
    // para futuro timeout/limpeza de sockets fantasmas.
    socket.emit('presence:ping', {} as Record<string, never>);
  });

  socket.on('disconnect', (reason) => {
    const code = (socket.data as { roomCode?: string }).roomCode;
    logger.info({ reason, code }, 'socket.disconnect');
    if (code) {
      void handleLeave(io, socket, code, /* silent */ true);
    }
  });
}

async function handleLeave(
  io: Server,
  socket: Socket,
  code: string,
  silent = false,
): Promise<void> {
  const userId = getUserId(socket);
  await socket.leave(code);
  (socket.data as { roomCode?: string }).roomCode = undefined;

  // Broadcast leave imediatamente.
  socket.to(code).emit('room:user_left', { userId });

  // Auto-clear do turno: se o user que saiu tinha o turno, zera e avisa.
  try {
    const p = pool();
    const room = await findRoomByCode(p, code);
    if (room) {
      const cleared = await clearTurnIfOwner(p, room.id, userId);
      if (cleared) {
        io.to(code).emit('turn:changed', { currentTurnUserId: null });
      }
    }
  } catch (err) {
    logger.error({ err, code, userId }, 'socket.handleLeave clearTurn falhou');
  }

  if (!silent) {
    try {
      const p = pool();
      const room = await findRoomByCode(p, code);
      if (!room) return;
      const user = await findUserById(p, userId);
      if (!user) return;
      const sysMsg = await postSystemMessage(p, room.id, `${user.name} saiu da sala.`);
      io.to(code).emit('chat:message', sysMsg);
    } catch (err) {
      logger.error({ err, code, userId }, 'socket.handleLeave side-effect falhou');
    }
  }
}

// helpers ---------------------------------------------------------------
function ackOk<T>(data: T): AckResult<T> {
  return { ok: true, data };
}
function ackErr(code: string, message: string): AckResult<never> {
  return { ok: false, error: { code, message } };
}

// re-exporta tipo do estado para o handler (evita import extra fora)
export type { RoomState };
