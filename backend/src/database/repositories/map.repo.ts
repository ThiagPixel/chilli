/**
 * Repositório de mapas.
 *
 * Tabela `maps` substitui o antigo `rooms.map_url`.
 * Suporta múltiplos mapas por sala; o índice único parcial garante
 * apenas um com `is_active = TRUE` por sala.
 */
import type { Pool, PoolClient } from 'pg';
import type { Map as RoomMap } from '../../types/domain.js';

type Executor = Pool | PoolClient;

interface MapRow {
  id: string;
  room_id: string;
  name: string;
  image_url: string;
  width: number | null;
  height: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: MapRow): RoomMap {
  return {
    id: row.id,
    roomId: row.room_id,
    name: row.name,
    imageUrl: row.image_url,
    width: row.width,
    height: row.height,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface CreateMapInput {
  roomId: string;
  name: string;
  imageUrl: string;
  width?: number | null;
  height?: number | null;
  isActive?: boolean;
}

/**
 * Cria um mapa. Se `isActive = true`, desativa os demais mapas da
 * sala na mesma transação (índice parcial garante apenas 1 ativo).
 */
export async function insertMap(exec: Executor, input: CreateMapInput): Promise<RoomMap> {
  if (input.isActive) {
    await exec.query(
      'UPDATE maps SET is_active = FALSE, updated_at = now() WHERE room_id = $1 AND is_active = TRUE',
      [input.roomId],
    );
  }
  const res = await exec.query<MapRow>(
    `INSERT INTO maps (room_id, name, image_url, width, height, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, room_id, name, image_url, width, height, is_active, created_at, updated_at`,
    [
      input.roomId,
      input.name,
      input.imageUrl,
      input.width ?? null,
      input.height ?? null,
      input.isActive ?? false,
    ],
  );
  const row = res.rows[0];
  if (!row) throw new Error('insertMap: no row returned');
  return mapRow(row);
}

export async function findMapById(exec: Executor, id: string): Promise<RoomMap | null> {
  const res = await exec.query<MapRow>(
    `SELECT id, room_id, name, image_url, width, height, is_active, created_at, updated_at
       FROM maps
      WHERE id = $1`,
    [id],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function findActiveMap(exec: Executor, roomId: string): Promise<RoomMap | null> {
  const res = await exec.query<MapRow>(
    `SELECT id, room_id, name, image_url, width, height, is_active, created_at, updated_at
       FROM maps
      WHERE room_id = $1 AND is_active = TRUE
      LIMIT 1`,
    [roomId],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function listMaps(exec: Executor, roomId: string): Promise<RoomMap[]> {
  const res = await exec.query<MapRow>(
    `SELECT id, room_id, name, image_url, width, height, is_active, created_at, updated_at
       FROM maps
      WHERE room_id = $1
      ORDER BY created_at DESC`,
    [roomId],
  );
  return res.rows.map(mapRow);
}

/** Ativa um mapa (e desativa os demais da sala). Idempotente. */
export async function activateMap(exec: Executor, roomId: string, mapId: string): Promise<RoomMap> {
  await exec.query(
    'UPDATE maps SET is_active = FALSE, updated_at = now() WHERE room_id = $1 AND is_active = TRUE',
    [roomId],
  );
  const res = await exec.query<MapRow>(
    `UPDATE maps
        SET is_active = TRUE,
            updated_at = now()
      WHERE id = $1 AND room_id = $2
      RETURNING id, room_id, name, image_url, width, height, is_active, created_at, updated_at`,
    [mapId, roomId],
  );
  const row = res.rows[0];
  if (!row) throw new Error(`activateMap: map ${mapId} not found in room ${roomId}`);
  return mapRow(row);
}

/** Desativa o mapa ativo de uma sala (se houver). Retorna o número de linhas afetadas. */
export async function deactivateActiveMap(exec: Executor, roomId: string): Promise<number> {
  const res = await exec.query(
    `UPDATE maps SET is_active = FALSE, updated_at = now()
      WHERE room_id = $1 AND is_active = TRUE`,
    [roomId],
  );
  return res.rowCount ?? 0;
}
