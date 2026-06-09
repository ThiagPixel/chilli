/**
 * Factories puras (sem I/O) para construir dados de teste.
 * Use `seedUser`/`seedRoom` para persistir (ver db.ts).
 *
 * Alinhado à modelagem aprovada.
 */
import { randomUUID } from 'node:crypto';
import type {
  User,
  Room,
  RoomMember,
  Message,
  DiceRoll,
  Character,
  Map as RoomMap,
} from '../../types/domain.js';

let counter = 0;
function uniq(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}-${Math.floor(Math.random() * 1e6)}`;
}

export function makeUser(overrides: Partial<User> = {}): User {
  const now = new Date();
  return {
    id: overrides.id ?? randomUUID(),
    name: overrides.name ?? `user-${uniq('u')}`,
    email: overrides.email ?? null,
    avatarUrl: overrides.avatarUrl ?? null,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

export function makeRoom(overrides: Partial<Room> = {}): Room {
  const now = new Date();
  return {
    id: overrides.id ?? randomUUID(),
    code: overrides.code ?? 'ABC23456',
    name: overrides.name ?? `room-${uniq('r')}`,
    description: overrides.description ?? null,
    masterId: overrides.masterId ?? randomUUID(),
    status: overrides.status ?? 'active',
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    closedAt: overrides.closedAt ?? null,
  };
}

export function makeRoomMember(overrides: Partial<RoomMember> = {}): RoomMember {
  return {
    id: overrides.id ?? randomUUID(),
    roomId: overrides.roomId ?? randomUUID(),
    userId: overrides.userId ?? randomUUID(),
    role: overrides.role ?? 'player',
    joinedAt: overrides.joinedAt ?? new Date(),
    leftAt: overrides.leftAt ?? null,
  };
}

export function makeCharacter(overrides: Partial<Character> = {}): Character {
  const now = new Date();
  return {
    id: overrides.id ?? randomUUID(),
    roomId: overrides.roomId ?? randomUUID(),
    userId: overrides.userId ?? randomUUID(),
    name: overrides.name ?? `char-${uniq('c')}`,
    data: overrides.data ?? {},
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

export function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: overrides.id ?? randomUUID(),
    roomId: overrides.roomId ?? randomUUID(),
    userId: overrides.userId ?? randomUUID(),
    type: overrides.type ?? 'text',
    content: overrides.content ?? 'olá',
    createdAt: overrides.createdAt ?? new Date(),
  };
}

export function makeDiceRoll(overrides: Partial<DiceRoll> = {}): DiceRoll {
  return {
    id: overrides.id ?? randomUUID(),
    roomId: overrides.roomId ?? randomUUID(),
    userId: overrides.userId ?? randomUUID(),
    expression: overrides.expression ?? '1d20',
    rolls: overrides.rolls ?? [10],
    modifier: overrides.modifier ?? 0,
    total: overrides.total ?? 10,
    createdAt: overrides.createdAt ?? new Date(),
  };
}

export function makeMap(overrides: Partial<RoomMap> = {}): RoomMap {
  const now = new Date();
  return {
    id: overrides.id ?? randomUUID(),
    roomId: overrides.roomId ?? randomUUID(),
    name: overrides.name ?? `map-${uniq('m')}`,
    imageUrl: overrides.imageUrl ?? `https://example.com/maps/${randomUUID()}.png`,
    width: overrides.width ?? 1920,
    height: overrides.height ?? 1080,
    isActive: overrides.isActive ?? false,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}
