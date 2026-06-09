/**
 * Room — REST para criar/entrar/consultar salas.
 *
 * Após `join`, a sala é dirigida por Socket.IO (chat, dados, mapa).
 */
import { api } from './api';
import type { Room, RoomMember } from '@/types';

export interface CreateRoomInput {
  name: string;
  description?: string | null;
}

export const roomService = {
  async create(input: CreateRoomInput): Promise<Room> {
    const { data } = await api.post<{ room: Room }>('/api/rooms', input);
    return data.room;
  },

  async getByCode(code: string): Promise<Room> {
    const { data } = await api.get<{ room: Room }>(`/api/rooms/${code}`);
    return data.room;
  },

  async join(code: string): Promise<{ room: Room; member: RoomMember; alreadyMember: boolean }> {
    const { data } = await api.post<{ room: Room; member: RoomMember; alreadyMember: boolean }>(
      `/api/rooms/${code}/join`,
    );
    return data;
  },

  async listMembers(code: string): Promise<RoomMember[]> {
    const { data } = await api.get<{ members: RoomMember[] }>(`/api/rooms/${code}/members`);
    return data.members;
  },
};
