/**
 * Contratos dos eventos Socket.IO.
 * Espelha `backend/src/types/socket-events.ts`.
 *
 * O frontend nunca envia payloads "soltos" — usa as interfaces daqui.
 */
import type { DiceRoll, Message, Room, RoomMap, RoomMember, User } from './domain';

// =========================================================================
// Helpers
// =========================================================================
export interface AckResult<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

export interface RoomState {
  room: Room;
  members: Array<{ user: User; role: RoomMember['role'] }>;
  recentMessages: Message[];
  recentRolls: DiceRoll[];
  activeMap: RoomMap | null;
}

// =========================================================================
// Cliente → Servidor
// =========================================================================
export interface ClientToServerEvents {
  'room:join': (
    payload: { code: string },
    ack: (res: AckResult<RoomState>) => void,
  ) => void;
  'room:leave': (payload: Record<string, never>) => void;
  'chat:send': (
    payload: { body: string },
    ack: (res: AckResult<Message>) => void,
  ) => void;
  'dice:roll': (
    payload: { expression: string },
    ack: (res: AckResult<DiceRoll>) => void,
  ) => void;
  'map:state': (payload: { mapId: string; x: number; y: number; zoom: number }) => void;
  'presence:ping': (payload: Record<string, never>) => void;
}

// =========================================================================
// Servidor → Cliente
// =========================================================================
export interface ServerToClientEvents {
  'room:state': (state: RoomState) => void;
  'room:user_joined': (payload: { user: User; role: RoomMember['role'] }) => void;
  'room:user_left': (payload: { userId: string }) => void;
  'chat:message': (message: Message) => void;
  'chat:history': (messages: Message[]) => void;
  'dice:result': (roll: DiceRoll) => void;
  'map:updated': (payload: { map: RoomMap; x: number; y: number; zoom: number }) => void;
  error: (payload: { code: string; message: string }) => void;
}

/** Tipagem do socket já conectado. */
export type ChilliSocket = {
  emit: <E extends keyof ClientToServerEvents>(
    event: E,
    ...args: Parameters<ClientToServerEvents[E]>
  ) => void;
  on(event: 'connect', listener: () => void): void;
  on(event: 'disconnect', listener: (reason: string) => void): void;
  on<E extends keyof ServerToClientEvents>(
    event: E,
    listener: ServerToClientEvents[E],
  ): void;
  off(event: 'connect', listener: () => void): void;
  off(event: 'disconnect', listener: (reason: string) => void): void;
  off<E extends keyof ServerToClientEvents>(
    event: E,
    listener: ServerToClientEvents[E],
  ): void;
  disconnect: () => void;
  connected: boolean;
};
