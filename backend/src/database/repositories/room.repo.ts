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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    closedAt: row.closed_at,
  };
}

export async function findRoomByCode(exec: Executor, code: string): Promise<Room | null> {
  const res = await exec.query<RoomRow>(
    `SELECT id, code, name, description, master_id, status, created_at, updated_at, closed_at
       FROM rooms
      WHERE code = $1`,
    [code],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function findRoomById(exec: Executor, id: string): Promise<Room | null> {
  const res = await exec.query<RoomRow>(
    `SELECT id, code, name, description, master_id, status, created_at, updated_at, closed_at
       FROM rooms
      WHERE id = $1`,
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
     RETURNING id, code, name, description, master_id, status, created_at, updated_at, closed_at`,
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
      RETURNING id, code, name, description, master_id, status, created_at, updated_at, closed_at`,
    [roomId, status],
  );
  const row = res.rows[0];
  if (!row) throw new Error(`setRoomStatus: room ${roomId} not found`);
  return mapRow(row);
}
