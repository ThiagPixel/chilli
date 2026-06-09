/**
 * Gerador de IDs curtos. Usa nanoid, mas com alfabeto sem ambiguidade
 * (espelhando o alfabeto dos códigos de sala do backend).
 */
import { customAlphabet } from 'nanoid';

// 32 chars sem 0/O, 1/I/L para evitar confusão na hora de digitar.
const SAFE_ALPHABET = '23456789abcdefghijkmnpqrstuvwxyz';
const generate = customAlphabet(SAFE_ALPHABET, 10);

/** deviceId persistente: identifica o "dispositivo anônimo" do usuário. */
export function newDeviceId(): string {
  return generate();
}
