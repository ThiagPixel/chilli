/**
 * Engine de rolagem de dados.
 *
 * Alinhado à modelagem aprovada:
 *   - Apenas `NdX±M` no MVP (sem keep/drop/advantage no schema).
 *   - Resultado estruturado em `rolls: number[]`, `modifier`, `total`.
 *
 * Suporta:
 *   - Singular/plural:        d20, 1d20, 3d6
 *   - Modificadores:          1d20+5, 2d6-1
 *   - Múltiplos termos:       1d20+2d6+3
 *   - Constantes:             +5, -2
 *   - Termos negativos:       -2d6, -1d8+3
 *
 * Limites:
 *   - Lados permitidos: {4, 6, 8, 10, 12, 20, 100}
 *   - Até 50 dados por expressão
 *   - Total final não pode exceder ±999 (defensivo)
 *
 * Convenções:
 *   - `+`/`-` entre dois termos (dado|dado, dado|constante, constante|dado) é separador.
 *   - `+`/`-` colado em um termo `NdX` é modificador (ex.: `2d6+1`).
 */
import { ValidationError } from '../utils/errors.js';

const ALLOWED_SIDES = new Set([4, 6, 8, 10, 12, 20, 100]);
const MAX_DICE = 50;
const MAX_TOTAL = 999;

// Cada termo da expressão: sinal opcional + corpo + modificador opcional.
//
// O lookahead negativo `(?![+\-]?\d*d)` impede que o modificador
// "engula" o início de outro termo de dado (ex.: `1d20+2d6+3` →
// `1d20` é o primeiro termo, e `+2d6+3` é o segundo, em vez de
// `1d20+2` + `d6+3`).
const TERM_PATTERN = /([+\-]?)(\d*d\d+(?:[+\-]\d+(?![+\-]?\d*d))?|\d+)/g;

const DICE_RE = /^(\d*)d(\d+)(?:([+\-])(\d+))?$/;
const CONST_RE = /^(\d+)$/;
const MOD_RE = /^([+\-])(\d+)$/;

export interface DiceTerm {
  sign: 1 | -1; // sinal herdado do operador
  count: number; // 0 = constante pura
  sides: number; // 0 = constante pura
  modifier: number; // 0 se não há modificador
}

export interface RollResult {
  expression: string;
  rolls: number[]; // sempre positivos
  modifier: number; // soma algébrica dos modificadores (sinais já aplicados)
  total: number;
}

function parseDiceValue(raw: string): { count: number; sides: number; modifier: number } {
  const m = DICE_RE.exec(raw);
  if (!m) throw new ValidationError(`Termo de dado inválido: "${raw}"`);
  const count = m[1] === '' || m[1] === undefined ? 1 : Number.parseInt(m[1], 10);
  const sides = Number.parseInt(m[2] ?? '0', 10);
  let modifier = 0;
  if (m[3] && m[4]) {
    const mm = MOD_RE.exec(`${m[3]}${m[4]}`);
    if (mm) {
      const sign = mm[1] === '-' ? -1 : 1;
      modifier = sign * Number.parseInt(mm[2] ?? '0', 10);
    }
  }

  if (!Number.isFinite(count) || count < 1 || count > MAX_DICE) {
    throw new ValidationError(`Quantidade de dados inválida: ${count}`);
  }
  if (!ALLOWED_SIDES.has(sides)) {
    throw new ValidationError(`Tipo de dado não suportado: d${sides}`);
  }

  return { count, sides, modifier };
}

function parseConstantValue(raw: string): number {
  const m = CONST_RE.exec(raw);
  if (!m) throw new ValidationError(`Constante inválida: "${raw}"`);
  return Number.parseInt(m[1] ?? '0', 10);
}

/** Faz o parser de uma expressão. Lança ValidationError se inválida. */
export function parseExpression(expression: string): DiceTerm[] {
  if (!expression || typeof expression !== 'string') {
    throw new ValidationError('Expressão vazia');
  }
  const trimmed = expression.replace(/\s+/g, '').toLowerCase();
  if (!trimmed) throw new ValidationError('Expressão vazia');

  const terms: DiceTerm[] = [];
  const re = new RegExp(TERM_PATTERN.source, 'g');
  let pos = 0;
  let totalDice = 0;

  while (pos < trimmed.length) {
    re.lastIndex = pos;
    const match = re.exec(trimmed);
    if (!match || match.index !== pos) {
      throw new ValidationError(`Expressão inválida em "${trimmed.slice(pos)}"`);
    }

    const signStr = match[1] ?? '';
    const value = match[2] ?? '';
    const sign: 1 | -1 = signStr === '-' ? -1 : 1;
    const isDice = value.includes('d');

    if (isDice) {
      const { count, sides, modifier } = parseDiceValue(value);
      terms.push({ sign, count, sides, modifier });
      totalDice += count;
    } else {
      const modifier = parseConstantValue(value);
      terms.push({ sign, count: 0, sides: 0, modifier });
    }

    pos = re.lastIndex;
  }

  if (terms.length === 0) {
    throw new ValidationError('Expressão precisa de pelo menos um dado ou constante');
  }
  if (totalDice > MAX_DICE) {
    throw new ValidationError(`Excesso de dados (máx ${MAX_DICE})`);
  }

  return terms;
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/** Rola uma expressão. Lança ValidationError se expressão inválida. */
export function roll(expression: string): RollResult {
  const terms = parseExpression(expression);
  const rolls: number[] = [];
  let totalModifier = 0;

  for (const t of terms) {
    if (t.count > 0) {
      for (let i = 0; i < t.count; i++) rolls.push(rollDie(t.sides));
    }
    totalModifier += t.sign * t.modifier;
  }

  const sum = rolls.reduce((a, b) => a + b, 0);
  const total = sum + totalModifier;

  if (total > MAX_TOTAL || total < -MAX_TOTAL) {
    throw new ValidationError(`Total fora do limite (±${MAX_TOTAL})`);
  }

  return { expression, rolls, modifier: totalModifier, total };
}
