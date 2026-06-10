/**
 * Histórico de rolagens — wrapper fino sobre o repositório.
 *
 * Existe como service próprio (separado do `dice.service.ts` que
 * cuida do parser/roller) para que handlers de socket e controllers
 * REST consumam o mesmo ponto de entrada.
 */
import type { Pool } from 'pg';
import { listDiceRolls, type ListDiceRollsParams } from '../database/repositories/diceRoll.repo.js';
import type { DiceRoll } from '../types/domain.js';

export async function getRecentRolls(
  pool: Pool,
  roomId: string,
  options: { before?: Date; limit?: number } = {},
): Promise<DiceRoll[]> {
  const params: ListDiceRollsParams = {
    roomId,
    limit: options.limit ?? 50,
    ...(options.before ? { before: options.before } : {}),
  };
  return listDiceRolls(pool, params);
}
