/**
 * MapToken service — gerencia tokens arrastáveis sobre o mapa.
 *
 * Regras de authz:
 *   - Criar token: mestre da sala.
 *   - Mover token: mestre da sala OU o `controllerUserId` do token
 *     (o "dono"). NPC (`controllerUserId = null`) é mestre-only.
 *   - Remover token: mestre da sala OU o dono.
 *
 * Posição é armazenada em "image-space" (pixels da imagem original)
 * — a renderização do cliente aplica a transform de pan/zoom do mapa.
 */
import type { Pool } from 'pg';
import {
  insertMapToken,
  findMapTokenById,
  deleteMapToken,
  updateMapTokenPosition,
  listTokensByRoom,
  listTokensByMap,
  type CreateMapTokenInput,
} from '../database/repositories/mapToken.repo.js';
import { findMapById } from '../database/repositories/map.repo.js';
import { assertIsMaster, assertIsMember } from './room.service.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';
import type { MapToken } from '../types/domain.js';

const LABEL_RE = /^[A-Za-z0-9À-ÿ]{1,3}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const MAX_COORD = 1_000_000; // pixels — limite arbitrário, evita tokens perdidos em coord absurda

export interface RegisterTokenInput {
  roomId: string;
  mapId: string;
  masterId: string;
  label: string;
  color?: string;
  x?: number;
  y?: number;
  controllerUserId?: string | null;
}

export async function registerMapToken(
  pool: Pool,
  input: RegisterTokenInput,
): Promise<MapToken> {
  await assertIsMaster(pool, input.roomId, input.masterId);

  const map = await findMapById(pool, input.mapId);
  if (!map || map.roomId !== input.roomId) {
    throw new NotFoundError('Mapa não encontrado nesta sala');
  }

  const label = (input.label ?? '').trim();
  if (!LABEL_RE.test(label)) {
    throw new ValidationError('Label deve ter 1-3 caracteres alfanuméricos');
  }

  const color = input.color ?? '#e53935';
  if (!COLOR_RE.test(color)) {
    throw new ValidationError('Cor deve ser hex no formato #RRGGBB');
  }

  const x = clampCoord(input.x);
  const y = clampCoord(input.y);

  const createInput: CreateMapTokenInput = {
    mapId: input.mapId,
    roomId: input.roomId,
    label,
    color,
    x,
    y,
    controllerUserId: input.controllerUserId ?? null,
  };
  return insertMapToken(pool, createInput);
}

export async function moveMapToken(
  pool: Pool,
  tokenId: string,
  userId: string,
  x: number,
  y: number,
): Promise<MapToken> {
  const token = await findMapTokenById(pool, tokenId);
  if (!token) throw new NotFoundError('Token não encontrado');

  // Authz: mestre sempre pode; jogador só pode mover o próprio token.
  // NPC (controllerUserId = null) é mestre-only.
  const isOwner = token.controllerUserId !== null && token.controllerUserId === userId;
  if (!isOwner) {
    await assertIsMaster(pool, token.roomId, userId);
  } else {
    // Confirma que o dono ainda é membro da sala.
    await assertIsMember(pool, token.roomId, userId);
  }

  const updated = await updateMapTokenPosition(pool, {
    id: tokenId,
    x: clampCoord(x),
    y: clampCoord(y),
  });
  if (!updated) throw new NotFoundError('Token não encontrado');
  return updated;
}

export async function removeMapToken(
  pool: Pool,
  tokenId: string,
  userId: string,
): Promise<MapToken> {
  const token = await findMapTokenById(pool, tokenId);
  if (!token) throw new NotFoundError('Token não encontrado');

  const isOwner = token.controllerUserId !== null && token.controllerUserId === userId;
  if (!isOwner) {
    await assertIsMaster(pool, token.roomId, userId);
  }

  const removed = await deleteMapToken(pool, tokenId);
  if (!removed) throw new NotFoundError('Token não encontrado');
  return removed;
}

export async function listRoomTokens(pool: Pool, roomId: string): Promise<MapToken[]> {
  return listTokensByRoom(pool, roomId);
}

export async function listMapTokens(pool: Pool, mapId: string): Promise<MapToken[]> {
  return listTokensByMap(pool, mapId);
}

function clampCoord(v: number | undefined): number {
  if (v === undefined || v === null || !Number.isFinite(v)) return 0;
  if (v > MAX_COORD) return MAX_COORD;
  if (v < -MAX_COORD) return -MAX_COORD;
  return v;
}
