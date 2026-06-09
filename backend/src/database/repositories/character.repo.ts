/**
 * Repositório de fichas (characters).
 *
 * Alinhado à modelagem aprovada:
 *   - `user_id` (não `owner_id`)
 *   - `data` é JSONB livre
 *   - 1 ficha por (room, user) garantida por UNIQUE no schema
 */
import type { Pool, PoolClient } from 'pg';
import type { Character } from '../../types/domain.js';

type Executor = Pool | PoolClient;

interface CharacterRow {
  id: string;
  room_id: string;
  user_id: string;
  name: string;
  data: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: CharacterRow): Character {
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    name: row.name,
    data: row.data,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface UpsertCharacterInput {
  roomId: string;
  userId: string;
  name: string;
  data: Record<string, unknown>;
}

/** Cria ou atualiza a ficha única (room_id, user_id). */
export async function upsertCharacter(
  exec: Executor,
  input: UpsertCharacterInput,
): Promise<Character> {
  const res = await exec.query<CharacterRow>(
    `INSERT INTO characters (room_id, user_id, name, data)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (room_id, user_id)
     DO UPDATE SET name       = EXCLUDED.name,
                   data       = EXCLUDED.data,
                   updated_at = now()
     RETURNING id, room_id, user_id, name, data, created_at, updated_at`,
    [input.roomId, input.userId, input.name, JSON.stringify(input.data)],
  );
  const row = res.rows[0];
  if (!row) throw new Error('upsertCharacter: no row returned');
  return mapRow(row);
}

export async function findCharacterById(
  exec: Executor,
  id: string,
): Promise<Character | null> {
  const res = await exec.query<CharacterRow>(
    `SELECT id, room_id, user_id, name, data, created_at, updated_at
       FROM characters
      WHERE id = $1`,
    [id],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function findCharacterByRoomAndUser(
  exec: Executor,
  roomId: string,
  userId: string,
): Promise<Character | null> {
  const res = await exec.query<CharacterRow>(
    `SELECT id, room_id, user_id, name, data, created_at, updated_at
       FROM characters
      WHERE room_id = $1 AND user_id = $2`,
    [roomId, userId],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function listCharacters(exec: Executor, roomId: string): Promise<Character[]> {
  const res = await exec.query<CharacterRow>(
    `SELECT id, room_id, user_id, name, data, created_at, updated_at
       FROM characters
      WHERE room_id = $1
      ORDER BY name ASC`,
    [roomId],
  );
  return res.rows.map(mapRow);
}
