/**
 * Handler de turnos: `turn:start` e `turn:end`.
 *
 * Mestre inicia o turno de um jogador. Auto-clear: se o jogador com
 * turno sair, o `room.handler` zera via `clearTurnIfOwner` e broadcasta
 * o `turn:changed` aqui (uma vez).
 *
 * Validações:
 *   - `turn:start`: mestre only; target precisa ser membro ATIVO.
 *   - `turn:end`: mestre only.
 */
import type { Server, Socket } from 'socket.io';
import { findRoomByCode, setCurrentTurn } from '../../database/repositories/room.repo.js';
import { findActiveMember } from '../../database/repositories/roomMember.repo.js';
import { getUserId } from '../auth.js';
import { pool } from '../room-state.js';
import { assertIsMaster } from '../../services/room.service.js';
import { logger } from '../../utils/logger.js';
import { AppError, NotFoundError } from '../../utils/errors.js';

export function registerTurnHandlers(io: Server, socket: Socket): void {
  socket.on('turn:start', async (payload) => {
    try {
      const code = (socket.data as { roomCode?: string }).roomCode;
      if (!code) return;
      const targetUserId = String(payload?.targetUserId ?? '');
      if (!targetUserId) {
        socket.emit('error', { code: 'VALIDATION_ERROR', message: 'targetUserId ausente' });
        return;
      }
      const userId = getUserId(socket);
      const p = pool();
      const room = await findRoomByCode(p, code);
      if (!room) {
        socket.emit('error', { code: 'NOT_FOUND', message: 'Sala não encontrada' });
        return;
      }
      await assertIsMaster(p, room.id, userId);

      // target precisa ser membro ATIVO.
      const targetMember = await findActiveMember(p, room.id, targetUserId);
      if (!targetMember) {
        throw new NotFoundError('Jogador não é membro ativo da sala');
      }

      const updated = await setCurrentTurn(p, room.id, targetUserId);
      io.to(code).emit('turn:changed', {
        currentTurnUserId: updated.currentTurnUserId,
        by: userId,
      });
    } catch (err) {
      if (err instanceof AppError) {
        socket.emit('error', { code: err.code, message: err.message });
      } else {
        logger.error({ err }, 'socket.turn:start falhou');
      }
    }
  });

  socket.on('turn:end', async () => {
    try {
      const code = (socket.data as { roomCode?: string }).roomCode;
      if (!code) return;
      const userId = getUserId(socket);
      const p = pool();
      const room = await findRoomByCode(p, code);
      if (!room) {
        socket.emit('error', { code: 'NOT_FOUND', message: 'Sala não encontrada' });
        return;
      }
      await assertIsMaster(p, room.id, userId);

      // Só broadcasta se havia turno ativo — evita ruído em cliques
      // idempotentes do mestre ("encerrar" sem ter turno).
      if (room.currentTurnUserId === null) return;
      await setCurrentTurn(p, room.id, null);
      io.to(code).emit('turn:changed', { currentTurnUserId: null, by: userId });
    } catch (err) {
      if (err instanceof AppError) {
        socket.emit('error', { code: err.code, message: err.message });
      } else {
        logger.error({ err }, 'socket.turn:end falhou');
      }
    }
  });
}
