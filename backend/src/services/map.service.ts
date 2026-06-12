/**
 * Map service — gerencia mapas da mesa.
 *
 * Alinhado à modelagem aprovada:
 *   - Tabela `maps` separada (não mais `rooms.map_url`).
 *   - Suporta múltiplos mapas por sala, com um ativo por vez.
 *   - Storage real (escrita em disco / S3) é responsabilidade da
 *     camada HTTP no passo 3 — aqui só persistimos metadata.
 */
import type { Pool } from 'pg';
import {
  insertMap,
  findMapById,
  findActiveMap,
  listMaps,
  activateMap,
  deactivateActiveMap,
  updateMapName,
  deleteMap,
  type CreateMapInput,
} from '../database/repositories/map.repo.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { assertIsMaster, assertIsMember } from './room.service.js';
import type { Map as RoomMap } from '../types/domain.js';

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);
const MAX_NAME = 100;

export interface RegisterMapInput {
  roomId: string;
  masterId: string;
  name: string;
  imageUrl: string;
  width?: number | null;
  height?: number | null;
  isActive?: boolean;
}

export async function registerMap(
  pool: Pool,
  input: RegisterMapInput,
): Promise<RoomMap> {
  const name = input.name?.trim() ?? '';
  if (name.length < 1 || name.length > MAX_NAME) {
    throw new ValidationError(`Nome do mapa deve ter entre 1 e ${MAX_NAME} caracteres`);
  }
  if (!input.imageUrl || !input.imageUrl.startsWith('http')) {
    throw new ValidationError('imageUrl inválida');
  }
  await assertIsMaster(pool, input.roomId, input.masterId);

  const createInput: CreateMapInput = {
    roomId: input.roomId,
    name,
    imageUrl: input.imageUrl,
    isActive: input.isActive ?? false,
    ...(input.width !== undefined ? { width: input.width } : {}),
    ...(input.height !== undefined ? { height: input.height } : {}),
  };
  return insertMap(pool, createInput);
}

export async function getActiveMap(pool: Pool, roomId: string): Promise<RoomMap | null> {
  return findActiveMap(pool, roomId);
}

export async function listRoomMaps(pool: Pool, roomId: string): Promise<RoomMap[]> {
  return listMaps(pool, roomId);
}

export async function activateRoomMap(
  pool: Pool,
  roomId: string,
  mapId: string,
  masterId: string,
): Promise<RoomMap> {
  await assertIsMaster(pool, roomId, masterId);
  const exists = await findMapById(pool, mapId);
  if (!exists || exists.roomId !== roomId) {
    throw new NotFoundError('Mapa não encontrado nesta sala');
  }
  return activateMap(pool, roomId, mapId);
}

export async function deactivateActiveRoomMap(
  pool: Pool,
  roomId: string,
  masterId: string,
): Promise<void> {
  await assertIsMaster(pool, roomId, masterId);
  await deactivateActiveMap(pool, roomId);
}

/** Renomeia um mapa (mestre). */
export async function renameRoomMap(
  pool: Pool,
  roomId: string,
  mapId: string,
  masterId: string,
  newName: string,
): Promise<RoomMap> {
  await assertIsMaster(pool, roomId, masterId);
  const trimmed = newName?.trim() ?? '';
  if (trimmed.length < 1 || trimmed.length > MAX_NAME) {
    throw new ValidationError(`Nome do mapa deve ter entre 1 e ${MAX_NAME} caracteres`);
  }
  const exists = await findMapById(pool, mapId);
  if (!exists || exists.roomId !== roomId) {
    throw new NotFoundError('Mapa não encontrado nesta sala');
  }
  const updated = await updateMapName(pool, mapId, trimmed);
  if (!updated) throw new NotFoundError('Mapa não encontrado');
  return updated;
}

/** Deleta um mapa (mestre). Retorna a imageUrl para limpeza do disco. */
export async function deleteRoomMap(
  pool: Pool,
  roomId: string,
  mapId: string,
  masterId: string,
): Promise<string> {
  await assertIsMaster(pool, roomId, masterId);
  const exists = await findMapById(pool, mapId);
  if (!exists || exists.roomId !== roomId) {
    throw new NotFoundError('Mapa não encontrado nesta sala');
  }
  const deleted = await deleteMap(pool, mapId);
  if (!deleted) throw new NotFoundError('Mapa não encontrado');
  return deleted.imageUrl;
}

/** Garante que o usuário pode ver o mapa ativo (membro da sala). */
export async function getActiveMapForMember(
  pool: Pool,
  roomId: string,
  userId: string,
): Promise<RoomMap | null> {
  await assertIsMember(pool, roomId, userId);
  return findActiveMap(pool, roomId);
}

/**
 * Validação prévia de upload (mime + tamanho).
 * Retornada para uso pelos controllers antes de gravar o arquivo.
 */
export interface UploadValidation {
  ok: true;
}
export interface UploadRejected {
  ok: false;
  reason: string;
}

export function validateUpload(mime: string, sizeBytes: number, maxBytes: number): UploadValidation | UploadRejected {
  if (!ALLOWED_MIME.has(mime)) {
    return { ok: false, reason: `Tipo não suportado: ${mime}` };
  }
  if (sizeBytes <= 0) {
    return { ok: false, reason: 'Arquivo vazio' };
  }
  if (sizeBytes > maxBytes) {
    return { ok: false, reason: `Arquivo maior que ${Math.round(maxBytes / 1024 / 1024)}MB` };
  }
  return { ok: true };
}
