/**
 * Tipos de domínio — espelham o backend (`backend/src/types/domain.ts`).
 *
 * Estes tipos são a "verdade" do frontend. Se mudar aqui, mudar lá.
 */

// =========================================================================
// Enums
// =========================================================================
export type RoomStatus = 'active' | 'paused' | 'closed';
export type RoomRole = 'master' | 'player';
export type MessageType = 'text' | 'system';

// =========================================================================
// User
// =========================================================================
export interface User {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// =========================================================================
// Room
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
  currentTurnStartedAt: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

// =========================================================================
// Room member
// =========================================================================
export interface RoomMember {
  id: string;
  roomId: string;
  userId: string;
  role: RoomRole;
  joinedAt: string;
  leftAt: string | null;
}

// =========================================================================
// Message (chat)
// =========================================================================
export interface Message {
  id: string;
  roomId: string;
  userId: string | null; // null em mensagens de sistema
  type: MessageType;
  content: string;
  createdAt: string;
}

// =========================================================================
// Dice roll
// =========================================================================
export interface DiceRoll {
  id: string;
  roomId: string;
  userId: string;
  expression: string;
  rolls: number[]; // valores individuais
  modifier: number;
  total: number;
  createdAt: string;
}

// =========================================================================
// Character (ficha)
// =========================================================================
export interface Character {
  id: string;
  roomId: string;
  userId: string;
  name: string;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// =========================================================================
// Map
// =========================================================================
export interface RoomMap {
  id: string;
  roomId: string;
  name: string;
  imageUrl: string;
  width: number | null;
  height: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// =========================================================================
// MapToken — marcador arrastável sobre o mapa
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
  createdAt: string;
  updatedAt: string;
}
