/**
 * Singleton do Socket.IO client.
 *
 * - Conecta sob demanda (lazy).
 * - Reenvia `auth.token` a cada reconexão (rotativo).
 * - Mantém handlers tipados via `ChilliSocket`.
 *
 * Por enquanto o token é o JWT guardado em cookie httpOnly. Quando o
 * handshake do Socket.IO precisar, o cliente envia via `auth.token`
 * (esse handshake é um upgrade HTTP — cookies sobem normalmente).
 */
import { io, type Socket } from 'socket.io-client';
import type { ChilliSocket } from '@/types';

const baseURL = import.meta.env.VITE_SOCKET_URL ?? '';

let socket: Socket | null = null;

export function getSocket(): ChilliSocket {
  if (!socket) {
    socket = io(baseURL || undefined, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 5_000,
    });
  }
  return socket as unknown as ChilliSocket;
}

/** Conecta o socket (lazy). Retorna o socket para chaining. */
export function connectSocket(): ChilliSocket {
  const s = getSocket();
  if (!s.connected) {
    // `connect` existe no `Socket` do socket.io-client; só omitimos do tipo público.
    (s as unknown as { connect: () => void }).connect();
  }
  return s;
}

export function disconnectSocket(): void {
  (socket as unknown as { disconnect: () => void } | null)?.disconnect();
}
