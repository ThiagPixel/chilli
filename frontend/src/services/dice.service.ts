/**
 * Dice — REST para histórico de rolagens.
 * (Rolar de fato é via Socket.IO; ver `useDice`.)
 */
import { api } from './api';
import type { DiceRoll } from '@/types';

export const diceService = {
  async history(code: string, limit = 50): Promise<DiceRoll[]> {
    const { data } = await api.get<{ rolls: DiceRoll[] }>(
      `/api/rooms/${code}/rolls?limit=${limit}`,
    );
    return data.rolls;
  },
};
