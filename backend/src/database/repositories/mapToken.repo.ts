/**
 * Repositório de tokens do mapa.
 *
 * Tabela `map_tokens` (migration 0002). Coordenadas em image-space
 * (pixels da imagem, independentes de pan/zoom do cliente). Tokens
 * pertencem a um `map` e, por denormalização, à `room` (facilita
 * a query "todos os tokens da sala" usada pelo `buildRoomState`).
 */
import type { Pool, PoolClient } from 'pg';
import type { MapToken } from '../../types/domain.js';

type Executor = Pool | PoolClient;

interface MapTokenRow {
  id: string;
  map_id: string;
  room_id: string;
  label: string;
  color: string;
  x: number;
  y: number;
  controller_user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: MapTokenRow): MapToken {
  return {
    id: row.id,
    mapId: row.map_id,
    roomId: row.room_id,
    label: row.label,
    color: row.color,
    x: row.x,
    y: row.y,
    controllerUserId: row.controller_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const TOKEN_COLS = `id, map_id, room_id, label, color, x, y, controller_user_id,
       created_at, updated_at`;

export interface CreateMapTokenInput {
  mapId: string;
  roomId: string;
  label: string;
  color?: string;
  x?: number;
  y?: number;
  controllerUserId?: string | null;
}

/**
 * Cria um token. Validações (label/color/range) ficam no service.
 * Coordenadas default = centro do mapa.
 */
export async function insertMapToken(
  exec: Executor,
  input: CreateMapTokenInput,
): Promise<MapToken> {
  const res = await exec.query<MapTokenRow>(
    `INSERT INTO map_tokens
       (map_id, room_id, label, color, x, y, controller_user_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${TOKEN_COLS}`,
    [
      input.mapId,
      input.roomId,
      input.label,
      input.color ?? '#e53935',
      input.x ?? 0,
      input.y ?? 0,
      input.controllerUserId ?? null,
    ],
  );
  const row = res.rows[0];
  if (!row) throw new Error('insertMapToken: no row returned');
  return mapRow(row);
}

export async function findMapTokenById(
  exec: Executor,
  id: string,
): Promise<MapToken | null> {
  const res = await exec.query<MapTokenRow>(
    `SELECT ${TOKEN_COLS} FROM map_tokens WHERE id = $1`,
    [id],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function listTokensByRoom(
  exec: Executor,
  roomId: string,
): Promise<MapToken[]> {
  const res = await exec.query<MapTokenRow>(
    `SELECT ${TOKEN_COLS} FROM map_tokens
      WHERE room_id = $1
      ORDER BY created_at ASC`,
    [roomId],
  );
  return res.rows.map(mapRow);
}

export async function listTokensByMap(
  exec: Executor,
  mapId: string,
): Promise<MapToken[]> {
  const res = await exec.query<MapTokenRow>(
    `SELECT ${TOKEN_COLS} FROM map_tokens
      WHERE map_id = $1
      ORDER BY created_at ASC`,
    [mapId],
  );
  return res.rows.map(mapRow);
}

export interface UpdateMapTokenPositionInput {
  id: string;
  x: number;
  y: number;
}

/** Atualiza só x/y. Outros campos não são editáveis no MVP. */
export async function updateMapTokenPosition(
  exec: Executor,
  input: UpdateMapTokenPositionInput,
): Promise<MapToken | null> {
  const res = await exec.query<MapTokenRow>(
    `UPDATE map_tokens
        SET x = $2,
            y = $3,
            updated_at = now()
      WHERE id = $1
      RETURNING ${TOKEN_COLS}`,
    [input.id, input.x, input.y],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function deleteMapToken(
  exec: Executor,
  id: string,
): Promise<MapToken | null> {
  const res = await exec.query<MapTokenRow>(
    `DELETE FROM map_tokens WHERE id = $1
     RETURNING ${TOKEN_COLS}`,
    [id],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}
