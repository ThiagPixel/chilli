/**
 * Helpers de localStorage com namespace e tipagem.
 *
 * Em vez de espalhar `localStorage.getItem('chilli.deviceId')` pelo código,
 * tudo passa por aqui — fica fácil mockar, migrar chaves e auditar.
 */
const PREFIX = 'chilli.';

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      /* quota / private mode — silencioso para o MVP */
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      /* idem */
    }
  },
};
