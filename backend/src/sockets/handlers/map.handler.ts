/**
 * Handler de mapa: `map:state` é a viewport (x/y/zoom) de quem está
 * olhando o mapa ativo. O servidor **não** persiste a viewport —
 * apenas repassa para os demais membros da sala e guarda o último
 * valor em memória para entregar a quem entrar depois via `room:state`.
 *
 * Upload e troca do mapa ativo são feitos via REST (master only).
 */
import type { Server, Socket } from 'socket.io';
import { findRoomByCode } from '../../database/repositories/room.repo.js';
import { findMapById } from '../../database/repositories/map.repo.js';
import { getUserId } from '../auth.js';
import { pool } from '../room-state.js';
import { setRoomView } from '../state.js';
import { logger } from '../../utils/logger.js';
import type { Map as RoomMap } from '../../types/domain.js';

export function registerMapHandlers(io: Server, socket: Socket): void {
  socket.on('map:state', async (payload) => {
    try {
      const code = (socket.data as { roomCode?: string }).roomCode;
      if (!code) return;
      const mapId = String(payload?.mapId ?? '');
      const x = Number(payload?.x ?? 0);
      const y = Number(payload?.y ?? 0);
      const zoom = Number(payload?.zoom ?? 1);
      if (!mapId || !Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(zoom)) {
        return;
      }

      const p = pool();
      const room = await findRoomByCode(p, code);
      if (!room) return;
      const map = await findMapById(p, mapId);
      if (!map || map.roomId !== room.id) return;

      // Viewport não é persistida em DB — só em memória.
      setRoomView(code, { mapId, x, y, zoom });

      // Broadcast (sem eco para o autor, que já ajustou localmente).
      socket.to(code).emit('map:updated', { map, x, y, zoom });
    } catch (err) {
      logger.error({ err }, 'socket.map:state falhou');
    }
  });
}

export type { RoomMap };
