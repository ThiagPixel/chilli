/**
 * Gerador de códigos curtos (ex.: código de sala).
 * Alfabeto exclui I, O, 0, 1 para evitar ambiguidade.
 */
import { randomBytes } from 'node:crypto';

export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Gera um código aleatório de `length` caracteres usando o alfabeto padrão. */
export function randomCode(length: number, alphabet = ROOM_CODE_ALPHABET): string {
  if (length <= 0) throw new Error('length deve ser positivo');
  if (alphabet.length < 2) throw new Error('alfabeto precisa de >= 2 símbolos');

  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    const byte = bytes[i] ?? 0;
    // Mapeamento módulo-alfabeto com viés mínimo (alphabet < 256)
    out += alphabet[byte % alphabet.length];
  }
  return out;
}
