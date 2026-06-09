/**
 * Sheet — fichas (personagens) da mesa.
 */
import { api } from './api';
import type { Character } from '@/types';

export const sheetService = {
  async list(code: string): Promise<Character[]> {
    const { data } = await api.get<{ characters: Character[] }>(`/api/rooms/${code}/characters`);
    return data.characters;
  },

  async upsert(code: string, payload: { name: string; data: Record<string, unknown> }): Promise<Character> {
    const { data } = await api.post<{ character: Character }>(
      `/api/rooms/${code}/characters`,
      payload,
    );
    return data.character;
  },

  async update(id: string, payload: { name?: string; data?: Record<string, unknown> }): Promise<Character> {
    const { data } = await api.patch<{ character: Character }>(`/api/characters/${id}`, payload);
    return data.character;
  },
};
