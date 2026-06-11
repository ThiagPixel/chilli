/**
 * useChat — mensagens em tempo real.
 *
 * - `messages`: snapshot da store (atualizada por `chat:message` e
 *   hidratada por `room:state`).
 * - `send(body)`: emite `chat:send` no socket; resolve com a mensagem
 *   persistida (ou `null` se o servidor rejeitar).
 * - `refresh()`: pede ao server o histórico mais recente via REST
 *   e hidrata a store (sem perder o que está scrollado no cliente).
 */
import { useCallback } from 'react';
import { useSocketContext } from '@/contexts/SocketContext';
import { useChatStore } from '@/stores/chat.store';
import { useRoom } from '@/hooks/useRoom';
import { chatService } from '@/services';
import { useToast } from '@/hooks/useToast';
import type { AckResult, Message } from '@/types';

export interface UseChatResult {
  messages: Message[];
  send: (body: string) => Promise<Message | null>;
  refresh: () => Promise<void>;
  clear: () => void;
}

export function useChat(): UseChatResult {
  const { socket } = useSocketContext();
  const { room } = useRoom();
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

  const refresh = useCallback(async (): Promise<void> => {
    if (!room?.code) return;
    try {
      const page = await chatService.history(room.code, undefined, 50);
      useChatStore.getState().hydrate(page.messages);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao atualizar chat';
      toast.error(message);
    }
  }, [room?.code, toast]);

  return { messages, send, refresh, clear };
}
