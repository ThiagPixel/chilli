/**
 * useChat — mensagens em tempo real.
 *
 * Stub: subscreve ao evento `chat:message` e expõe `messages` + `send`.
 * A store Zustand (chat.store) é a fonte do array.
 */
import { useCallback } from 'react';
import { useSocketEvent } from './useSocket';
import { useChatStore } from '@/stores/chat.store';
import type { Message } from '@/types';

export function useChat(enabled = true) {
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.add);
  const clear = useChatStore((s) => s.clear);

  useSocketEvent('chat:message', (msg: Message) => addMessage(msg), enabled);

  const send = useCallback((_body: string) => {
    // TODO fase 5: socket.emit('chat:send', { body })
    return Promise.resolve();
  }, []);

  return { messages, send, clear };
}
