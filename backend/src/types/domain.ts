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
