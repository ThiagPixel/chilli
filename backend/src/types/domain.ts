/**
 * Tipos de domínio — espelham o schema Postgres (snake_case → camelCase).
 * Estes tipos são a "verdade" usada em services e (futuramente) controllers.
 *
 * Alinhados à modelagem aprovada (sem deviceId, sem sheet_schema, etc.).
 */

// =========================================================================
// Enums
// =========================================================================
export type RoomStatus = 'active' | 'paused' | 'closed';
export type RoomRole = 'master' | 'player';
export type MessageType = 'text' | 'system';

// =========================================================================
// users
// =========================================================================
export interface User {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// =========================================================================
// rooms
// =========================================================================
export interface Room {
  id: string;
  code: string;
  name: string;
  description: string | null;
  masterId: string;
  status: RoomStatus;
  /** UUID do user com o turno ativo; null = sem turno. */
  currentTurnUserId: string | null;
  /** Início do turno atual; null = sem turno. */
  currentTurnStartedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
}

// =========================================================================
// room_members
// =========================================================================
export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  role: RoomRole;
  joinedAt: Date;
  leftAt: Date | null;
}

// =========================================================================
// messages
// =========================================================================
export interface Message {
  id: string;
  roomId: string;
  userId: string | null; // NULL em mensagens de sistema
  type: MessageType;
  content: string;
  createdAt: Date;
}

// =========================================================================
// dice_rolls
// =========================================================================
export interface DiceRoll {
  id: string;
  roomId: string;
  userId: string;
  expression: string;
  rolls: number[]; // valores individuais rolados
  modifier: number;
  total: number;
  createdAt: Date;
}

// =========================================================================
// characters
// =========================================================================
export interface Character {
  id: string;
  roomId: string;
  userId: string;
  name: string;
  data: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// =========================================================================
// maps
// =========================================================================
export interface Map {
  id: string;
  roomId: string;
  name: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// =========================================================================
// map tokens — marcadores arrastáveis sobre o mapa
// =========================================================================
export interface MapToken {
  id: string;
  mapId: string;
  roomId: string;
  /** 1-3 letras exibidas no centro do círculo. */
  label: string;
  /** Cor do token em hex (#RRGGBB). */
  color: string;
  /** Coordenada X no image-space (pixels da imagem, sem pan/zoom). */
  x: number;
  /** Coordenada Y no image-space. */
  y: number;
  /**
   * User que pode mover este token. NULL = NPC (mestre-only).
   * Mestre sempre pode mover qualquer token, mesmo que não seja o dono.
   */
  controllerUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
