/**
 * Handler de dados: `dice:roll` recebe a expressão, faz parse +
 * rola, persiste em `dice_rolls` e faz broadcast.
 */
import type { Server, Socket } from 'socket.io';
import { findRoomByCode } from '../../database/repositories/room.repo.js';
import { roll } from '../../services/dice.service.js';
import { insertDiceRoll } from '../../database/repositories/diceRoll.repo.js';
import { getUserId } from '../auth.js';
import { pool } from '../room-state.js';
import { logger } from '../../utils/logger.js';
import type { AckResult } from '../../types/socket-events.js';
import type { DiceRoll } from '../../types/domain.js';

export function registerDiceHandlers(io: Server, socket: Socket): void {
  socket.on('dice:roll', async (payload, ack) => {
    try {
      const expression = String(payload?.expression ?? '').trim();
      if (!expression) {
        ack(ackErr('VALIDATION_ERROR', 'Expressão vazia'));
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

      // `roll` lança ValidationError se expressão for inválida.
      const result = roll(expression);
      const rollRow = await insertDiceRoll(p, {
        roomId: room.id,
        userId,
        expression,
        rolls: result.rolls,
        modifier: result.modifier,
        total: result.total,
      });

      io.to(code).emit('dice:result', rollRow);
      ack(ackOk(rollRow));
    } catch (err) {
      logger.error({ err }, 'socket.dice:roll falhou');
      const code = err instanceof Error && 'code' in err
        ? (err as { code?: string }).code ?? 'VALIDATION_ERROR'
        : 'INTERNAL';
      ack(ackErr(code, err instanceof Error ? err.message : 'Falha ao rolar dados'));
    }
  });
}

function ackOk<T>(data: T): AckResult<T> {
  return { ok: true, data };
}
function ackErr(code: string, message: string): AckResult<never> {
  return { ok: false, error: { code, message } };
}
