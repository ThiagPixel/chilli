/**
 * Auth — usuário anônimo baseado em `deviceId`.
 *
 * Contrato (backend, ARCHITECTURE §7):
 *   POST /api/auth/anonymous { deviceId, name, avatarUrl? } → { user, token }
 *   GET  /api/auth/me → { user }
 *
 * O `deviceId` é gerado uma vez e guardado em localStorage pelo hook
 * `useAuth`. O backend cria (ou recupera) o usuário e devolve o JWT
 * — o JWT é armazenado em cookie httpOnly pelo servidor, não aqui.
 */
import { api, ApiError } from './api';
import type { User } from '@/types';

export interface AnonymousAuthInput {
  deviceId: string;
  name: string;
  avatarUrl?: string | null;
}

export interface AnonymousAuthResponse {
  user: User;
}

export const authService = {
  async anonymous(input: AnonymousAuthInput): Promise<AnonymousAuthResponse> {
    try {
      const { data } = await api.post<AnonymousAuthResponse>('/api/auth/anonymous', input);
      return data;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError('AUTH_FAILED', 'Não foi possível autenticar', 0);
    }
  },

  async me(): Promise<User> {
    try {
      const { data } = await api.get<{ user: User }>('/api/auth/me');
      return data.user;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError('AUTH_ME_FAILED', 'Não foi possível obter o usuário', 0);
    }
  },
};
