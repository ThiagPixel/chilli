/**
 * Tipos dos eventos Socket.IO.
 * Implementação completa virá no passo 4. Aqui deixamos os contratos
 * para que services já possam emitir tipos alinhados.
 *
 * Alinhados à modelagem aprovada (sem rollId em Message, role master/player, etc.).
 */
import type { Message, DiceRoll, Room, RoomMember, User, Map } from './domain.js';

// =========================================================================
// Cliente → Servidor
// =========================================================================
export interface ClientToServerEvents {
  'room:join': (payload: { code: string }, ack: (res: AckResult<RoomState>) => void) => void;
  'room:leave': (payload: Record<string, never>) => void;
  'chat:send': (payload: { body: string }, ack: (res: AckResult<Message>) => void) => void;
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
  'room:user_joined': (payload: { user: User; role: 'master' | 'player' }) => void;
  'room:user_left': (payload: { userId: string }) => void;
  'chat:message': (message: Message) => void;
  'chat:history': (messages: Message[]) => void;
  'dice:result': (roll: DiceRoll) => void;
  'map:updated': (payload: { map: Map; x: number; y: number; zoom: number }) => void;
  error: (payload: { code: string; message: string }) => void;
}

// =========================================================================
// Auxiliares
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
  activeMap: Map | null;
}
