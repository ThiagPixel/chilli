/**
 * RoomContext — gerencia a sala ativa (código, membros, estado de join).
 *
 * Fluxo:
 *   1. `join(code)` chama REST `roomService.join(code)` para garantir
 *      membership no banco.
 *   2. Se OK, emite `room:join` no Socket.IO; o servidor devolve o
 *      `RoomState` completo via ack.
 *   3. Hidrata stores (players, chat, dice, map) com o estado inicial.
 *   4. Assina eventos em tempo real (join/leave, chat:message, dice:result,
 *      map:updated).
 *   5. `leave()` emite `room:leave` e limpa tudo.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useSocketContext } from './SocketContext';
import { roomService } from '@/services';
import { useChatStore } from '@/stores/chat.store';
import { useDiceStore } from '@/stores/dice.store';
import { usePlayersStore } from '@/stores/players.store';
import { useMapStore } from '@/stores/map.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useTurnStore } from '@/stores/turn.store';
import { useToast } from '@/hooks/useToast';
import type { AckResult, RoomState, User, RoomMember, MapToken } from '@/types';
import type { Room } from '@/types';

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
  const { socket, isConnected } = useSocketContext();
  const toast = useToast();

  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<RoomContextValue['members']>([]);
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Hidrata stores a partir de um `RoomState` vindo do servidor.
  const hydrateFromState = useCallback((state: RoomState) => {
    setRoom(state.room);
    setMembers(state.members);
    usePlayersStore.getState().set(state.members);
    useChatStore.getState().hydrate(state.recentMessages);
    useDiceStore.getState().hydrate(state.recentRolls);
    useMapStore.getState().setMaps(state.maps ?? []);
    // `setActive(null)` zera a view mas preserva a lista de mapas.
    useMapStore.getState().setActive(state.activeMap);
    useTokensStore.getState().set(state.tokens ?? []);
    useTurnStore.getState().set(state.currentTurnUserId ?? null);
  }, []);

  // Cleanup universal: zera stores locais.
  const resetLocalState = useCallback(() => {
    setRoom(null);
    setMembers([]);
    setIsJoined(false);
    usePlayersStore.getState().clear();
    useChatStore.getState().clear();
    useDiceStore.getState().clear();
    useMapStore.getState().reset();
    useTokensStore.getState().clear();
    useTurnStore.getState().clear();
  }, []);

  // ---- JOIN ------------------------------------------------------------
  const join = useCallback(
    async (code: string) => {
      setIsJoining(true);
      setError(null);
      try {
        // 1) Membership no banco (REST).
        const res = await roomService.join(code);
        setRoom(res.room);

        // 2) Entra na sala via socket. Se ainda não estiver conectado,
        //    esperamos o `connect` (o SocketContext já está auto-conectando).
        const emitJoin = (): Promise<AckResult<RoomState>> =>
          new Promise<AckResult<RoomState>>((resolve) => {
            socket.emit('room:join', { code: res.room.code }, (ack: AckResult<RoomState>) => {
              resolve(ack);
            });
          });

        let ack: AckResult<RoomState>;
        if (isConnected) {
          ack = await emitJoin();
        } else {
          // Espera o `connect` (1 retry com timeout curto).
          ack = await new Promise<AckResult<RoomState>>((resolve) => {
            const onConnect = (): void => {
              socket.off('connect', onConnect as never);
              void emitJoin().then(resolve);
            };
            socket.on('connect', onConnect as never);
            setTimeout(() => {
              socket.off('connect', onConnect as never);
              resolve({ ok: false, error: { code: 'TIMEOUT', message: 'Conexão socket não estabelecida' } });
            }, 5000);
          });
        }

        if (!ack.ok || !ack.data) {
          const msg = ack.error?.message ?? 'Falha ao entrar na sala via socket';
          setError(msg);
          toast.error(msg);
          return;
        }

        hydrateFromState(ack.data);
        setIsJoined(true);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Falha ao entrar na sala';
        setError(message);
        toast.error(message);
      } finally {
        setIsJoining(false);
      }
    },
    [socket, isConnected, hydrateFromState, toast],
  );

  // ---- LEAVE -----------------------------------------------------------
  const leave = useCallback(async () => {
    if (isJoined) {
      socket.emit('room:leave', {});
    }
    resetLocalState();
  }, [socket, isJoined, resetLocalState]);

  // ---- REJOIN AUTOMÁTICO APOS RECONEXÃO -------------------------------
  // Quando o socket reconecta (isConnected vira true depois de estar false),
  // e estamos em uma sala (isJoined=true), re-emitimos `room:join`.
  // O server handler é idempotente (já checa `alreadyJoined` para não
  // postar system message duplicada) e devolve o RoomState completo
  // via ack — re-hidrata tudo.
  useEffect(() => {
    if (!isConnected || !isJoined || !room) return;
    // Flag: garante que o rejoin só dispara numa transição false→true,
    // não em todo render onde isConnected é true.
    let rejoinInFlight = false;
    const onConnect = (): void => {
      if (rejoinInFlight) return;
      rejoinInFlight = true;
      socket.emit('room:join', { code: room.code }, (ack: AckResult<RoomState>) => {
        rejoinInFlight = false;
        if (ack.ok && ack.data) {
          // Re-hidrata tudo com o estado fresco do server.
          hydrateFromState(ack.data);
        }
      });
    };
    // socket.io-client emite `connect` em todo reconnect.
    socket.on('connect', onConnect as never);
    return () => {
      socket.off('connect', onConnect as never);
    };
  }, [isConnected, isJoined, room, socket, hydrateFromState]);

  // ---- LISTENERS REALTIME ---------------------------------------------
  // Registram só quando isJoined. Limpeza automática no unmount.
  useEffect(() => {
    if (!isJoined) return undefined;

    const onUserJoined = (payload: { user: User; role: RoomMember['role'] }): void => {
      usePlayersStore.getState().add(payload.user, payload.role);
    };
    const onUserLeft = (payload: { userId: string }): void => {
      usePlayersStore.getState().remove(payload.userId);
    };
    const onChatMessage = (msg: import('@/types').Message): void => {
      useChatStore.getState().add(msg);
    };
    const onDiceResult = (roll: import('@/types').DiceRoll): void => {
      useDiceStore.getState().add(roll);
    };
    const onMapUpdated = (payload: { map: import('@/types').RoomMap; x: number; y: number; zoom: number }): void => {
      useMapStore.getState().setActive(payload.map);
      useMapStore.getState().setView({ x: payload.x, y: payload.y, zoom: payload.zoom });
    };
    const onMapsList = (payload: { maps: import('@/types').RoomMap[] }): void => {
      // Fonte de verdade do servidor. Substitui a lista inteira.
      useMapStore.getState().setMaps(payload.maps);
      // Recalcula o `active`: mantém se ainda existe; senão, pega o
      // primeiro com isActive=true; senão, null (sem mudar a view).
      const store = useMapStore.getState();
      const stillThere = payload.maps.find((m) => m.id === store.active?.id);
      const nextActive =
        stillThere ??
        payload.maps.find((m) => m.isActive) ??
        null;
      if (nextActive !== store.active) {
        // Não resetamos a view quando trocamos automaticamente — o
        // `map:updated` separado se encarrega da viewport.
        useMapStore.getState().setActiveKeepView(nextActive);
      }
    };
    const onTokenCreated = (payload: { token: MapToken }): void => {
      useTokensStore.getState().add(payload.token);
    };
    const onTokenMoved = (payload: { tokenId: string; x: number; y: number; by: string }): void => {
      useTokensStore.getState().update(payload.tokenId, { x: payload.x, y: payload.y });
    };
    const onTokenRemoved = (payload: { tokenId: string }): void => {
      useTokensStore.getState().remove(payload.tokenId);
    };
    const onTurnChanged = (payload: { currentTurnUserId: string | null; by?: string }): void => {
      useTurnStore.getState().set(payload.currentTurnUserId);
    };
    const onError = (err: { code: string; message: string }): void => {
      toast.error(err.message || err.code);
    };

    socket.on('room:user_joined', onUserJoined);
    socket.on('room:user_left', onUserLeft);
    socket.on('chat:message', onChatMessage);
    socket.on('dice:result', onDiceResult);
    socket.on('map:updated', onMapUpdated);
    socket.on('maps:list', onMapsList);
    socket.on('token:created', onTokenCreated);
    socket.on('token:moved', onTokenMoved);
    socket.on('token:removed', onTokenRemoved);
    socket.on('turn:changed', onTurnChanged);
    socket.on('error', onError);

    return () => {
      socket.off('room:user_joined', onUserJoined);
      socket.off('room:user_left', onUserLeft);
      socket.off('chat:message', onChatMessage);
      socket.off('dice:result', onDiceResult);
      socket.off('map:updated', onMapUpdated);
      socket.off('maps:list', onMapsList);
      socket.off('token:created', onTokenCreated);
      socket.off('token:moved', onTokenMoved);
      socket.off('token:removed', onTokenRemoved);
      socket.off('turn:changed', onTurnChanged);
      socket.off('error', onError);
    };
  }, [socket, isJoined, toast]);

  // ---- LIMPEZA NO UNMOUNT ---------------------------------------------
  useEffect(() => {
    return () => {
      // Não emitimos `room:leave` aqui (o socket pode estar desconectando
      // por logout, e o server trata disconnect = leave automaticamente).
      resetLocalState();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: RoomContextValue = useMemo(
    () => ({ room, members, isJoined, isJoining, error, join, leave }),
    [room, members, isJoined, isJoining, error, join, leave],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

/** Hook para consumir o contexto de sala. */
export function useRoomContextInternal(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) {
    throw new Error('useRoomContext deve ser usado dentro de <RoomProvider>');
  }
  return ctx;
}
