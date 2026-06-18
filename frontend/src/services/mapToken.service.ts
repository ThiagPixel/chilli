/**
 * mapToken service — REST para criar/remover tokens do mapa.
 *
 * Movimentação é via socket (`token:move`) — latência baixa para drag.
 * REST só lida com:
 *   - create → POST   /api/rooms/:code/map/:mapId/tokens
 *   - delete → DELETE /api/rooms/:code/tokens/:tokenId
 */
import { api } from './api';
import type { MapToken } from '@/types';

export interface CreateTokenInput {
  label: string;
  color?: string;
  x?: number;
  y?: number;
  controllerUserId?: string | null;
}

export const mapTokenService = {
  async create(code: string, mapId: string, input: CreateTokenInput): Promise<MapToken> {
    const { data } = await api.post<{ token: MapToken }>(
      `/api/rooms/${code}/map/${mapId}/tokens`,
      input,
    );
    return data.token;
  },

  async delete(code: string, tokenId: string): Promise<void> {
    await api.delete(`/api/rooms/${code}/tokens/${tokenId}`);
  },
};
