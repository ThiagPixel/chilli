/**
 * chat.store — buffer em memória das mensagens recebidas.
 *
 * Não persiste localmente (o backend guarda tudo). É só o "snapshot"
 * que o componente de chat consome. Limite macio de 500 mensagens
 * para não estourar memória em sessões longas.
 */
import { create } from 'zustand';
import type { Message } from '@/types';

const SOFT_LIMIT = 500;

interface ChatState {
  messages: Message[];
  add: (message: Message) => void;
  hydrate: (messages: Message[]) => void;
  clear: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  add: (message) =>
    set((state) => {
      const next = [...state.messages, message];
      return { messages: next.length > SOFT_LIMIT ? next.slice(-SOFT_LIMIT) : next };
    }),
  hydrate: (messages) => set({ messages }),
  clear: () => set({ messages: [] }),
}));
