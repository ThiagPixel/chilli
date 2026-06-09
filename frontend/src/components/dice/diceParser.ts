/**
 * Parser local de expressões de dados.
 * Stub: delega para o backend via Socket.IO. Mantém o esqueleto
 * para uma versão client-side posterior (preview do resultado).
 *
 * A engine real (com limites e validação robusta) está em
 * `backend/src/services/dice.service.ts`.
 */
import type { DiceSides } from './DiceButton';

export interface ParsedTerm {
  sign: 1 | -1;
  count: number;
  sides: DiceSides;
  modifier: number;
}

const SIMPLE_RE = /^([+\-]?)(\d*)d(\d+)(?:([+\-])(\d+))?$/i;

export function parseSimpleExpression(input: string): ParsedTerm | null {
  const expr = input.replace(/\s+/g, '');
  const m = SIMPLE_RE.exec(expr);
  if (!m) return null;

  const sign = m[1] === '-' ? -1 : 1;
  const count = m[2] === '' || m[2] === undefined ? 1 : Number.parseInt(m[2], 10);
  const sides = Number.parseInt(m[3] ?? '0', 10) as DiceSides;
  const modSign = m[4] === '-' ? -1 : 1;
  const mod = m[5] ? modSign * Number.parseInt(m[5], 10) : 0;

  if (!Number.isFinite(count) || count < 1) return null;
  if (![4, 6, 8, 10, 12, 20, 100].includes(sides)) return null;

  return { sign, count, sides, modifier: mod };
}
