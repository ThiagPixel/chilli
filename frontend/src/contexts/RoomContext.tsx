/**
 * RoomContext — gerencia a sala ativa (código, membros, estado de join).
 *
 * Stub: expõe a forma final, mas a lógica de `join/leave` é placeholder.
 * O provider cuida de:
 *  - Manter o código da sala atual.
 *  - Coordenar socket: entrar/sair conforme o componente `Room.tsx` monta/desmonta.
 *  - Expor `room`, `members`, `messages` (via stores) e `isJoined`.
 */
import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import type { Room, RoomMember, User } from '@/types';
import { roomService } from '@/services';

export interface RoomContextValue {
  room: Room | null;
  members: Array<{ user: User; role: RoomMember['role'] }>;
  isJoined: boolean;
  isJoining: boolean;
  error: string | null;
  join: (code: string) => Promise<void>;
  leave: () => Promise<void>;
}

export const RoomContext = createContext<RoomContextValue | null>(null);

interface RoomProviderProps {
  children: ReactNode;
}

export function RoomProvider({ children }: RoomProviderProps) {
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomContextValue['members']>([]);
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const join = useCallback(async (code: string) => {
    setIsJoining(true);
    setError(null);
    try {
      const res = await roomService.join(code);
      setRoom(res.room);
      setIsJoined(true);
      // TODO fase 5: socket.connect() + socket.emit('room:join', { code })
      // Os membros virão no `room:state`.
      void res;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha ao entrar na sala';
      setError(message);
    } finally {
      setIsJoining(false);
    }
  }, []);

  const leave = useCallback(async () => {
    // TODO fase 5: socket.emit('room:leave')
    setRoom(null);
    setMembers([]);
    setIsJoined(false);
  }, []);

  const value: RoomContextValue = useMemo(
    () => ({ room, members, isJoined, isJoining, error, join, leave }),
    [room, members, isJoined, isJoining, error, join, leave],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
