/**
 * Repositório de membros de sala.
 *
 * Alinhado à modelagem aprovada:
 *   - `role` ∈ {'master','player'}
 *   - `joined_at` + `left_at` (permite histórico; índice único parcial
 *     garante apenas um registro ATIVO por (room, user))
 *   - sem `last_seen_at`
 */
import type { Pool, PoolClient } from 'pg';
import type { RoomMember, RoomRole } from '../../types/domain.js';

type Executor = Pool | PoolClient;

interface RoomMemberRow {
  id: string;
  room_id: string;
  user_id: string;
  role: RoomRole;
  joined_at: Date;
  left_at: Date | null;
}

function mapRow(row: RoomMemberRow): RoomMember {
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
    leftAt: row.left_at,
  };
}

/** Retorna o membro ATIVO (left_at IS NULL) para (room, user), se existir. */
export async function findActiveMember(
  exec: Executor,
  roomId: string,
  userId: string,
): Promise<RoomMember | null> {
  const res = await exec.query<RoomMemberRow>(
    `SELECT id, room_id, user_id, role, joined_at, left_at
       FROM room_members
      WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL`,
    [roomId, userId],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

/** Lista todos os membros ATIVOS de uma sala, em ordem de entrada. */
export async function listActiveMembers(exec: Executor, roomId: string): Promise<RoomMember[]> {
  const res = await exec.query<RoomMemberRow>(
    `SELECT id, room_id, user_id, role, joined_at, left_at
       FROM room_members
      WHERE room_id = $1 AND left_at IS NULL
      ORDER BY joined_at ASC`,
    [roomId],
  );
  return res.rows.map(mapRow);
}

/** Lista o histórico completo de membership de um usuário. */
export async function listMembershipsByUser(exec: Executor, userId: string): Promise<RoomMember[]> {
  const res = await exec.query<RoomMemberRow>(
    `SELECT id, room_id, user_id, role, joined_at, left_at
       FROM room_members
      WHERE user_id = $1
      ORDER BY joined_at DESC`,
    [userId],
  );
  return res.rows.map(mapRow);
}

export interface AddMemberInput {
  roomId: string;
  userId: string;
  role: RoomRole;
}

/**
 * Insere um novo membro. Falha com unique violation se já houver
 * registro ATIVO para (room, user) — use `rejoinRoom` para reentrada.
 */
export async function insertMember(exec: Executor, input: AddMemberInput): Promise<RoomMember> {
  const res = await exec.query<RoomMemberRow>(
    `INSERT INTO room_members (room_id, user_id, role)
     VALUES ($1, $2, $3)
     RETURNING id, room_id, user_id, role, joined_at, left_at`,
    [input.roomId, input.userId, input.role],
  );
  const row = res.rows[0];
  if (!row) throw new Error('insertMember: no row returned');
  return mapRow(row);
}

/**
 * Reentrada: se já existe um registro histórico (left_at != NULL),
 * reabre definindo left_at = NULL. Se já existe ativo, retorna-o.
 */
export async function rejoinRoom(exec: Executor, input: AddMemberInput): Promise<RoomMember> {
  // Tenta reabrir histórico
  const reopened = await exec.query<RoomMemberRow>(
    `UPDATE room_members
        SET left_at = NULL,
            role    = $3
      WHERE room_id = $1 AND user_id = $2 AND left_at IS NOT NULL
      RETURNING id, room_id, user_id, role, joined_at, left_at`,
    [input.roomId, input.userId, input.role],
  );
  if (reopened.rows[0]) return mapRow(reopened.rows[0]);

  // Senão, insere novo registro
  return insertMember(exec, input);
}

/** Marca o membro como saído (left_at = now()). Idempotente. */
export async function leaveRoom(
  exec: Executor,
  roomId: string,
  userId: string,
): Promise<RoomMember | null> {
  const res = await exec.query<RoomMemberRow>(
    `UPDATE room_members
        SET left_at = now()
      WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL
      RETURNING id, room_id, user_id, role, joined_at, left_at`,
    [roomId, userId],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}
