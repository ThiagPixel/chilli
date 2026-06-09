/**
 * Sheet service — gerencia fichas (characters) dos jogadores por sala.
 *
 * Alinhado à modelagem aprovada:
 *   - `user_id` (não `owner_id`)
 *   - 1 ficha por (sala, jogador) — UNIQUE no schema
 *   - `data` é JSONB livre (sistema-agnóstico)
 */
import type { Pool } from 'pg';
import {
  upsertCharacter,
  findCharacterById,
  findCharacterByRoomAndUser,
  listCharacters,
} from '../database/repositories/character.repo.js';
import { findRoomById } from '../database/repositories/room.repo.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.js';
import { assertIsMember } from './room.service.js';
import type { Character } from '../types/domain.js';

const MAX_NAME = 100;

export interface UpsertCharacterInput {
  roomId: string;
  userId: string;
  name: string;
  data: Record<string, unknown>;
}

export async function saveCharacter(
  pool: Pool,
  input: UpsertCharacterInput,
): Promise<Character> {
  const name = input.name?.trim() ?? '';
  if (name.length < 1 || name.length > MAX_NAME) {
    throw new ValidationError(`Nome da ficha deve ter entre 1 e ${MAX_NAME} caracteres`);
  }
  if (input.data === null || typeof input.data !== 'object' || Array.isArray(input.data)) {
    throw new ValidationError('data deve ser um objeto JSON');
  }
  const room = await findRoomById(pool, input.roomId);
  if (!room) throw new NotFoundError('Sala não encontrada');
  await assertIsMember(pool, input.roomId, input.userId);

  return upsertCharacter(pool, {
    roomId: input.roomId,
    userId: input.userId,
    name,
    data: input.data,
  });
}

export async function getCharacter(pool: Pool, id: string): Promise<Character> {
  const ch = await findCharacterById(pool, id);
  if (!ch) throw new NotFoundError('Ficha não encontrada');
  return ch;
}

export async function getMyCharacter(
  pool: Pool,
  roomId: string,
  userId: string,
): Promise<Character | null> {
  return findCharacterByRoomAndUser(pool, roomId, userId);
}

export async function listRoomCharacters(pool: Pool, roomId: string): Promise<Character[]> {
  return listCharacters(pool, roomId);
}

export async function updateCharacter(
  pool: Pool,
  id: string,
  userId: string,
  patch: { name?: string; data?: Record<string, unknown> },
): Promise<Character> {
  const existing = await findCharacterById(pool, id);
  if (!existing) throw new NotFoundError('Ficha não encontrada');
  if (existing.userId !== userId) {
    throw new ForbiddenError('Você não é dono desta ficha');
  }

  const name = patch.name?.trim() ?? existing.name;
  if (name.length < 1 || name.length > MAX_NAME) {
    throw new ValidationError(`Nome da ficha deve ter entre 1 e ${MAX_NAME} caracteres`);
  }
  const data = patch.data ?? existing.data;
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new ValidationError('data deve ser um objeto JSON');
  }
  return upsertCharacter(pool, {
    roomId: existing.roomId,
    userId,
    name,
    data,
  });
}
