/**
 * Geração de códigos únicos de sala.
 * Estratégia: gerar + checar no banco; retry em colisão.
 * Limite: 5 tentativas; em caso de falha, propaga o erro.
 */
import type { Pool } from 'pg';
import { ROOM_CODE_ALPHABET, randomCode } from '../utils/code.js';
import { findRoomByCode } from '../database/repositories/room.repo.js';
import { ConflictError } from '../utils/errors.js';

const MAX_ATTEMPTS = 5;
const DEFAULT_LENGTH = 8;

export async function generateUniqueRoomCode(
  pool: Pool,
  length = DEFAULT_LENGTH,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = randomCode(length, ROOM_CODE_ALPHABET);
    const existing = await findRoomByCode(pool, code);
    if (!existing) return code;
  }
  throw new ConflictError('Não foi possível gerar um código único de sala');
}
