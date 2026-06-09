/**
 * Validações client-side.
 *
 * Espelham limites do backend (evita 400 desnecessário), mas a fonte da
 * verdade é o servidor. Toda validação aqui é só UX.
 */

export const NAME_MIN = 1;
export const NAME_MAX = 32;
export const ROOM_NAME_MAX = 100;
export const ROOM_DESC_MAX = 2000;
export const MESSAGE_MAX = 2000;
export const CODE_LENGTH = 6;
// Backend gera códigos de 6–8 chars (default 8). Aceitamos ambos no cliente.
export const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6,8}$/;

export function isValidName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= NAME_MIN && trimmed.length <= NAME_MAX;
}

export function isValidRoomName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= NAME_MIN && trimmed.length <= ROOM_NAME_MAX;
}

export function isValidRoomCode(code: string): boolean {
  return CODE_PATTERN.test(code.trim().toUpperCase());
}

export function isValidMessageBody(body: string): boolean {
  const trimmed = body.trim();
  return trimmed.length >= 1 && trimmed.length <= MESSAGE_MAX;
}
