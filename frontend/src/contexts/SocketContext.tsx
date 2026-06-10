/**
 * SocketContext — gerencia o ciclo de vida do Socket.IO.
 *
 * Conecta automaticamente quando o `user` do AuthContext está
 * disponível; desconecta no logout. O resto da aplicação consome
 * `isConnected` para mostrar feedback de conexão.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getSocket, connectSocket, disconnectSocket } from '@/services/socket';
import { useAuth } from '@/hooks/useAuth';
import type { ChilliSocket } from '@/types';

export interface SocketContextValue {
  socket: ChilliSocket;
  isConnected: boolean;
}

export const SocketContext = createContext<SocketContextValue | null>(null);

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { user } = useAuth();
  const socket = useMemo<ChilliSocket>(() => getSocket(), []);
  const [isConnected, setIsConnected] = useState<boolean>(socket.connected);

  useEffect(() => {
    const onConnect = (): void => setIsConnected(true);
    const onDisconnect = (): void => setIsConnected(false);
    // Os eventos `connect`/`disconnect` são nativos do socket.io-client;
    // eles não estão tipados no nosso `ChilliSocket` (que só conhece os
    // eventos do domínio), então fazemos cast.
    socket.on('connect', onConnect as never);
    socket.on('disconnect', onDisconnect as never);
    return () => {
      socket.off('connect', onConnect as never);
      socket.off('disconnect', onDisconnect as never);
    };
  }, [socket]);

  // Auto-connect quando o user autentica; auto-disconnect quando sai.
  useEffect(() => {
    if (user) {
      connectSocket();
    } else {
      disconnectSocket();
    }
    // O `socket` em si é estável (singleton); só reagimos ao user.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value = useMemo<SocketContextValue>(
    () => ({ socket, isConnected }),
    [socket, isConnected],
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

/** Hook para consumir o socket context. */
export function useSocketContext(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error('useSocketContext deve ser usado dentro de <SocketProvider>');
  }
  return ctx;
}
