/**
 * Map — upload via multipart e listagem de mapas da sala.
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
};
