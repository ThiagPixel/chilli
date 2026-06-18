/**
 * Repositório de salas.
 *
 * Alinhado à modelagem aprovada:
 *   - `master_id` (não `owner_id`)
 *   - `description` (TEXT, opcional)
 *   - `closed_at` (TIMESTAMPTZ, opcional)
 *   - `status` ∈ {'active','paused','closed'}
 *   - sem `map_url` / `sheet_schema` (mapa agora é tabela própria)
 */
import type { Pool, PoolClient } from 'pg';
import type { Room, RoomStatus } from '../../types/domain.js';

type Executor = Pool | PoolClient;

interface RoomRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  master_id: string;
  status: RoomStatus;
  current_turn_user_id: string | null;
  current_turn_started_at: Date | null;
  created_at: Date;
  updated_at: Date;
  closed_at: Date | null;
}

function mapRow(row: RoomRow): Room {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    masterId: row.master_id,
    status: row.status,
    currentTurnUserId: row.current_turn_user_id,
    currentTurnStartedAt: row.current_turn_started_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
  };
}

const ROOM_COLS = `id, code, name, description, master_id, status,
       current_turn_user_id, current_turn_started_at,
       created_at, updated_at, closed_at`;

export async function findRoomByCode(exec: Executor, code: string): Promise<Room | null> {
  const res = await exec.query<RoomRow>(
    `SELECT ${ROOM_COLS} FROM rooms WHERE code = $1`,
    [code],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function findRoomById(exec: Executor, id: string): Promise<Room | null> {
  const res = await exec.query<RoomRow>(
    `SELECT ${ROOM_COLS} FROM rooms WHERE id = $1`,
    [id],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function listRoomsByMaster(exec: Executor, masterId: string): Promise<Room[]> {
  const res = await exec.query<RoomRow>(
    `SELECT id, code, name, description, master_id, status, created_at, updated_at, closed_at
       FROM rooms
      WHERE master_id = $1
      ORDER BY created_at DESC`,
    [masterId],
  );
  return res.rows.map(mapRow);
}

export interface CreateRoomInput {
  code: string;
  name: string;
  description?: string | null;
  masterId: string;
}

export async function insertRoom(exec: Executor, input: CreateRoomInput): Promise<Room> {
  const res = await exec.query<RoomRow>(
    `INSERT INTO rooms (code, name, description, master_id)
     VALUES ($1, $2, $3, $4)
     RETURNING ${ROOM_COLS}`,
    [input.code, input.name, input.description ?? null, input.masterId],
  );
  const row = res.rows[0];
  if (!row) throw new Error('insertRoom: no row returned');
  return mapRow(row);
}

export async function setRoomStatus(
  exec: Executor,
  roomId: string,
  status: RoomStatus,
): Promise<Room> {
  const closedAt = status === 'closed' ? 'now()' : 'NULL';
  const res = await exec.query<RoomRow>(
    `UPDATE rooms
        SET status     = $2,
            closed_at  = ${closedAt},
            updated_at = now()
      WHERE id = $1
      RETURNING ${ROOM_COLS}`,
    [roomId, status],
  );
  const row = res.rows[0];
  if (!row) throw new Error(`setRoomStatus: room ${roomId} not found`);
  return mapRow(row);
}

/**
 * Define (ou limpa) o turno ativo da sala. Passa `userId = null` para
 * encerrar. Usado pelo socket handler de turno e pelo cleanup automático
 * quando o jogador com o turno sai.
 *
 * Cast explícito `$2::uuid` para Postgres inferir o tipo no `CASE` —
 * sem isso, o driver falha com "could not determine data type of parameter $2".
 */
export async function setCurrentTurn(
  exec: Executor,
  roomId: string,
  userId: string | null,
): Promise<Room> {
  const res = await exec.query<RoomRow>(
    `UPDATE rooms
        SET current_turn_user_id    = $2::uuid,
            current_turn_started_at = CASE WHEN $2::uuid IS NULL THEN NULL ELSE now() END,
            updated_at              = now()
      WHERE id = $1
      RETURNING ${ROOM_COLS}`,
    [roomId, userId],
  );
  const row = res.rows[0];
  if (!row) throw new Error(`setCurrentTurn: room ${roomId} not found`);
  return mapRow(row);
}

/**
 * Limpa o turno ativo se o userId informado é quem está com o turno.
 * Retorna true se limpou (sinaliza que o caller deve broadcasta o change).
 * Idempotente: se o userId não é o dono do turno, não faz nada.
 */
export async function clearTurnIfOwner(
  exec: Executor,
  roomId: string,
  userId: string,
): Promise<boolean> {
  const res = await exec.query(
    `UPDATE rooms
        SET current_turn_user_id    = NULL,
            current_turn_started_at = NULL,
            updated_at              = now()
      WHERE id = $1 AND current_turn_user_id = $2`,
    [roomId, userId],
  );
  return (res.rowCount ?? 0) > 0;
}
