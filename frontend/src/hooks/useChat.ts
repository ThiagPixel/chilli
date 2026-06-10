/**
 * useChat — mensagens em tempo real.
 *
 * - `messages`: snapshot da store (atualizada por `chat:message` e
 *   hidratada por `room:state`).
 * - `send(body)`: emite `chat:send` no socket; resolve com a mensagem
 *   persistida (ou `null` se o servidor rejeitar).
 */
import { useCallback } from 'react';
import { useSocketContext } from '@/contexts/SocketContext';
import { useChatStore } from '@/stores/chat.store';
import { useToast } from '@/hooks/useToast';
import type { AckResult, Message } from '@/types';

export interface UseChatResult {
  messages: Message[];
  send: (body: string) => Promise<Message | null>;
  clear: () => void;
}

export function useChat(): UseChatResult {
  const { socket } = useSocketContext();
  const messages = useChatStore((s) => s.messages);
  const clear = useChatStore((s) => s.clear);
  const toast = useToast();

  const send = useCallback(
    (body: string): Promise<Message | null> => {
      const trimmed = body.trim();
      if (!trimmed) return Promise.resolve(null);
      return new Promise<Message | null>((resolve) => {
        socket.emit('chat:send', { body: trimmed }, (ack: AckResult<Message>) => {
          if (ack.ok && ack.data) {
            resolve(ack.data);
            return;
          }
          const msg = ack.error?.message ?? 'Falha ao enviar mensagem';
          toast.error(msg);
          resolve(null);
        });
      });
    },
    [socket, toast],
  );

  return { messages, send, clear };
}
