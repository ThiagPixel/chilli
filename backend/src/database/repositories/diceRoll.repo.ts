/**
 * Repositório de rolagens de dados.
 *
 * Alinhado à modelagem aprovada:
 *   - colunas `rolls` (JSONB), `modifier` (INTEGER), `total` (INTEGER)
 *   - sem `is_private` (todas as rolagens são visíveis aos membros da sala)
 *   - sem `details` JSONB com kept/dropped (modelo não tem keep/drop no MVP)
 */
import type { Pool, PoolClient } from 'pg';
import type { DiceRoll } from '../../types/domain.js';

type Executor = Pool | PoolClient;

interface DiceRollRow {
  id: string;
  room_id: string;
  user_id: string;
  expression: string;
  rolls: number[];
  modifier: number;
  total: number;
  created_at: Date;
}

function mapRow(row: DiceRollRow): DiceRoll {
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    expression: row.expression,
    rolls: row.rolls,
    modifier: row.modifier,
    total: row.total,
    createdAt: row.created_at,
  };
}

export interface InsertDiceRollInput {
  roomId: string;
  userId: string;
  expression: string;
  rolls: number[];
  modifier: number;
  total: number;
}

export async function insertDiceRoll(
  exec: Executor,
  input: InsertDiceRollInput,
): Promise<DiceRoll> {
  const res = await exec.query<DiceRollRow>(
    `INSERT INTO dice_rolls (room_id, user_id, expression, rolls, modifier, total)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     RETURNING id, room_id, user_id, expression, rolls, modifier, total, created_at`,
    [input.roomId, input.userId, input.expression, JSON.stringify(input.rolls), input.modifier, input.total],
  );
  const row = res.rows[0];
  if (!row) throw new Error('insertDiceRoll: no row returned');
  return mapRow(row);
}

export interface ListDiceRollsParams {
  roomId: string;
  before?: Date;
  limit: number;
}

export async function listDiceRolls(
  exec: Executor,
  params: ListDiceRollsParams,
): Promise<DiceRoll[]> {
  const limit = Math.min(Math.max(params.limit, 1), 200);
  const before = params.before ?? null;
  const res = await exec.query<DiceRollRow>(
    `SELECT id, room_id, user_id, expression, rolls, modifier, total, created_at
       FROM dice_rolls
      WHERE room_id = $1
        AND ($2::timestamptz IS NULL OR created_at < $2)
      ORDER BY created_at DESC
      LIMIT $3`,
    [params.roomId, before, limit],
  );
  return res.rows.map(mapRow);
}
