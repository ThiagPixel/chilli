/**
 * SocketContext — status da conexão Socket.IO e helpers de subscribe.
 *
 * Stub: expõe a forma final, mas só repassa o estado do singleton.
 * O provider real vai cuidar de auto-connect quando o usuário
 * estiver autenticado e numa sala.
 */
import { createContext, useMemo, type ReactNode } from 'react';
import type { ChilliSocket } from '@/types';
import { getSocket } from '@/services';

export interface SocketContextValue {
  socket: ChilliSocket;
  isConnected: boolean;
}

export const SocketContext = createContext<SocketContextValue | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const value: SocketContextValue = useMemo(() => {
    const socket = getSocket();
    return { socket, isConnected: socket.connected };
  }, []);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
