/**
 * Map — upload via multipart, listagem e mutações de mapas da sala.
 *
 * Operações disponíveis (mestre):
 *   - list    → GET    /api/rooms/:code/maps
 *   - upload  → POST   /api/rooms/:code/map               (multipart)
 *   - activate→ POST   /api/rooms/:code/map/:mapId/active
 *   - rename  → PATCH  /api/rooms/:code/map/:mapId
 *   - delete  → DELETE /api/rooms/:code/map/:mapId
 *
 * Respostas de mutação devolvem `{ map }` (exceto `delete`, 204).
 */
import { api } from './api';
import type { RoomMap } from '@/types';

export const mapService = {
  async list(code: string): Promise<RoomMap[]> {
    const { data } = await api.get<{ maps: RoomMap[] }>(`/api/rooms/${code}/maps`);
    return data.maps;
  },

  async upload(code: string, file: File, name: string): Promise<RoomMap> {
    const form = new FormData();
    form.append('file', file);
    form.append('name', name);
    const { data } = await api.post<{ map: RoomMap }>(`/api/rooms/${code}/map`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.map;
  },

  async activate(code: string, mapId: string): Promise<RoomMap> {
    const { data } = await api.post<{ map: RoomMap }>(
      `/api/rooms/${code}/map/${mapId}/active`,
      {},
    );
    return data.map;
  },

  async rename(code: string, mapId: string, name: string): Promise<RoomMap> {
    const { data } = await api.patch<{ map: RoomMap }>(
      `/api/rooms/${code}/map/${mapId}`,
      { name },
    );
    return data.map;
  },

  async delete(code: string, mapId: string): Promise<void> {
    await api.delete(`/api/rooms/${code}/map/${mapId}`);
  },
};
