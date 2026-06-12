/**
 * Dice — REST para histórico de rolagens.
 * (Rolar de fato é via Socket.IO; ver `useDice`.)
 */
import { api } from './api';
import type { DiceRoll } from '@/types';

export const diceService = {
  /**
   * Histórico de rolagens.
   * - `before` (opcional): cursor ISO de `createdAt` para paginar
   *   rolagens mais antigas.
   * - `limit` (opcional): default 50, max 200 (validado no server).
   */
  async history(code: string, before?: string, limit = 50): Promise<DiceRoll[]> {
    const params = new URLSearchParams();
    if (before) params.set('before', before);
    params.set('limit', String(limit));
    const { data } = await api.get<{ rolls: DiceRoll[] }>(
      `/api/rooms/${code}/rolls?${params.toString()}`,
    );
    return data.rolls;
  },
};
