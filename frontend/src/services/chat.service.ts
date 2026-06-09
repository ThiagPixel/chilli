/**
 * Chat — REST para histórico (Socket.IO envia o tempo real).
 */
import { api } from './api';
import type { Message } from '@/types';

export interface MessagePage {
  messages: Message[];
  nextCursor: string | null;
}

export const chatService = {
  async history(code: string, before?: string, limit = 50): Promise<MessagePage> {
    const params = new URLSearchParams();
    if (before) params.set('before', before);
    params.set('limit', String(limit));
    const { data } = await api.get<MessagePage>(
      `/api/rooms/${code}/messages?${params.toString()}`,
    );
    return data;
  },
};
