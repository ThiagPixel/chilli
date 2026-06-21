/**
 * Handler de tokens: `token:move` é a posição (x/y em image-space).
 *
 * O servidor NÃO é autoritativo em pixels de drag — a UI move otimista
 * e envia a posição final. Em troca:
 *   - Valida o token existe e pertence à sala.
 *   - Aplica authz: mestre OU dono do token.
 *   - Persiste e broadcasta para os outros membros.
 *
 * Criação/remoção ficam no controller REST (master only ou dono).
 */
import type { Server, Socket } from 'socket.io';
import { getUserId } from '../auth.js';
import { pool } from '../room-state.js';
import { moveMapToken } from '../../services/mapToken.service.js';
import { logger } from '../../utils/logger.js';
import { AppError } from '../../utils/errors.js';

export function registerMapTokenHandlers(io: Server, socket: Socket): void {
  socket.on('token:move', async (payload) => {
    try {
      const code = (socket.data as { roomCode?: string }).roomCode;
      if (!code) return;
      const tokenId = String(payload?.tokenId ?? '');
      const x = Number(payload?.x);
      const y = Number(payload?.y);
      if (!tokenId || !Number.isFinite(x) || !Number.isFinite(y)) return;

      const userId = getUserId(socket);
      const updated = await moveMapToken(pool(), tokenId, userId, x, y);

      // Broadcast (sem eco para o autor, que já moveu localmente).
      socket.to(code).emit('token:moved', {
        tokenId: updated.id,
        x: updated.x,
        y: updated.y,
        by: userId,
      });
    } catch (err) {
      // Authz errors: devolve erro só para o autor, sem derrubar a conexão.
      if (err instanceof AppError) {
        socket.emit('error', { code: err.code, message: err.message });
      } else {
        logger.error({ err }, 'socket.token:move falhou');
      }
    }
  });
}
