/**
 * useSocket — pega o singleton Socket.IO e oferece um wrapper
 * para registrar/desregistrar handlers com `useEffect`.
 *
 * Estrutura intencionalmente simples; sem sala específica aqui —
 * a sala (room:join, room:leave) é responsabilidade de `useRoom`.
 */
import { useEffect } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '@/services/socket';
import type { ChilliSocket, ServerToClientEvents } from '@/types';

export interface UseSocketResult {
  socket: ChilliSocket;
  isConnected: boolean;
}

export function useSocket(autoConnect = false): UseSocketResult {
  const socket = getSocket();

  useEffect(() => {
    if (autoConnect) {
      connectSocket();
      return () => {
        disconnectSocket();
      };
    }
    return undefined;
  }, [autoConnect]);

  return { socket, isConnected: socket.connected };
}

/**
 * Helper para registrar listener com cleanup automático.
 *
 *   useSocketEvent('chat:message', (msg) => setMessages((m) => [...m, msg]));
 */
export function useSocketEvent<E extends keyof ServerToClientEvents>(
  event: E,
  handler: ServerToClientEvents[E],
  enabled = true,
): void {
  const { socket } = useSocket();
  useEffect(() => {
    if (!enabled) return undefined;
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
    // handler pode mudar a cada render — confiamos que o chamador estabiliza.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, event, enabled]);
}
