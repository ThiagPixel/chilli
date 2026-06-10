/**
 * Construtor do `RoomState` entregue no `room:join` e no `room:state`.
 *
 * Centraliza a leitura paralela das várias fontes (sala, membros,
 * mensagens, rolagens, mapa) para que `room:join` e `room:state`
 * (broadcast) emitam sempre o mesmo shape.
 */
import type { Pool } from 'pg';
import { getPool } from '../database/connection.js';
import { findRoomByCode } from '../database/repositories/room.repo.js';
import { listActiveMembers } from '../database/repositories/roomMember.repo.js';
import { findUserById } from '../database/repositories/user.repo.js';
import { getRecentMessages } from '../services/message.service.js';
import { getRecentRolls } from '../services/dice.history.service.js';
import { getActiveMap } from '../services/map.service.js';
import { getRoomView } from './state.js';
import type { RoomState } from '../types/socket-events.js';

const HISTORY_LIMIT = 50;

export async function buildRoomState(pool: Pool, roomCode: string): Promise<RoomState> {
  const room = await findRoomByCode(pool, roomCode);
  if (!room) throw new Error('Sala não encontrada');

  const [members, recentMessagesDesc, recentRolls, activeMap] = await Promise.all([
    listActiveMembers(pool, room.id),
    getRecentMessages(pool, room.id, { limit: HISTORY_LIMIT }),
    getRecentRolls(pool, room.id, { limit: HISTORY_LIMIT }),
    getActiveMap(pool, room.id),
  ]);

  // Resolve os User de cada membro em paralelo.
  const memberViews = await Promise.all(
    members.map(async (m) => {
      const user = await findUserById(pool, m.userId);
      if (!user) return null; // membro órfão — não inclui
      return { user, role: m.role };
    }),
  );

  // Mensagens vêm DESC do service (padrão para paginação). O chat
  // exibe em ordem cronológica (ASC), então invertemos.
  const recentMessages = [...recentMessagesDesc].reverse();

  // Viewport em memória: a sala tem mapa ativo E a última view é
  // desse mesmo mapa? Caso contrário, ignora view (volta ao padrão).
  const view = getRoomView(roomCode);
  void view; // mantemos a API uniforme no payload; view é repopulada
             // por `map:updated` à medida que clientes movem.

  return {
    room,
    members: memberViews.filter((m): m is NonNullable<typeof m> => m !== null),
    recentMessages,
    recentRolls,
    activeMap,
  };
}

/** Helper usado por todos os handlers — pega o pool singleton. */
export function pool(): import('pg').Pool {
  return getPool();
}
