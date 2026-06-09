/**
 * Room service — criar, entrar, sair e consultar salas.
 *
 * Alinhado à modelagem aprovada:
 *   - `master_id` (não `owner_id`)
 *   - `role` ∈ {'master','player'}
 *   - `room_members` com `left_at` (histórico de participações)
 */
import type { Pool } from 'pg';
import {
  findRoomByCode,
  findRoomById,
  insertRoom,
  type CreateRoomInput,
} from '../database/repositories/room.repo.js';
import {
  findActiveMember,
  insertMember,
  rejoinRoom,
  leaveRoom as leaveRoomRepo,
  listActiveMembers,
  listMembershipsByUser,
} from '../database/repositories/roomMember.repo.js';
import { findUserById } from '../database/repositories/user.repo.js';
import { generateUniqueRoomCode } from './code.service.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '../utils/errors.js';
import type { Room, RoomMember, RoomRole } from '../types/domain.js';

const MAX_NAME = 100;
const MAX_DESCRIPTION = 2000;

export interface CreateRoomResult {
  room: Room;
  member: RoomMember;
}

export async function createRoom(
  pool: Pool,
  masterId: string,
  name: string,
  description?: string | null,
): Promise<CreateRoomResult> {
  const trimmedName = name?.trim() ?? '';
  if (trimmedName.length < 1 || trimmedName.length > MAX_NAME) {
    throw new ValidationError(`Nome da sala deve ter entre 1 e ${MAX_NAME} caracteres`);
  }

  if (description !== null && description !== undefined) {
    const trimmedDesc = description.trim();
    if (trimmedDesc.length > MAX_DESCRIPTION) {
      throw new ValidationError(`Descrição deve ter no máximo ${MAX_DESCRIPTION} caracteres`);
    }
  }

  const master = await findUserById(pool, masterId);
  if (!master) throw new ValidationError('Usuário criador não encontrado');

  const code = await generateUniqueRoomCode(pool);
  const input: CreateRoomInput = {
    code,
    name: trimmedName,
    description: description?.trim() || null,
    masterId,
  };
  const room = await insertRoom(pool, input);

  // Mestre entra automaticamente como master
  const member = await insertMember(pool, { roomId: room.id, userId: masterId, role: 'master' });
  return { room, member };
}

export interface JoinRoomResult {
  room: Room;
  member: RoomMember;
  alreadyMember: boolean;
}

export async function joinRoom(
  pool: Pool,
  code: string,
  userId: string,
): Promise<JoinRoomResult> {
  const room = await findRoomByCode(pool, code);
  if (!room) throw new NotFoundError('Sala não encontrada');
  if (room.status === 'closed') throw new ConflictError('Sala encerrada');

  const existing = await findActiveMember(pool, room.id, userId);
  if (existing) {
    return { room, member: existing, alreadyMember: true };
  }

  // Mestre da sala continua sendo master em qualquer reentrada.
  const role: RoomRole = room.masterId === userId ? 'master' : 'player';
  const member = await rejoinRoom(pool, { roomId: room.id, userId, role });
  return { room, member, alreadyMember: false };
}

export async function getRoomByCode(pool: Pool, code: string): Promise<Room> {
  const room = await findRoomByCode(pool, code);
  if (!room) throw new NotFoundError('Sala não encontrada');
  return room;
}

export async function getRoomById(pool: Pool, roomId: string): Promise<Room> {
  const room = await findRoomById(pool, roomId);
  if (!room) throw new NotFoundError('Sala não encontrada');
  return room;
}

export async function leaveRoom(pool: Pool, roomId: string, userId: string): Promise<void> {
  await leaveRoomRepo(pool, roomId, userId);
}

export async function listRoomMembers(pool: Pool, roomId: string): Promise<RoomMember[]> {
  return listActiveMembers(pool, roomId);
}

export async function listUserRooms(pool: Pool, userId: string): Promise<RoomMember[]> {
  return listMembershipsByUser(pool, userId);
}

/** Verifica se o usuário é mestre ATIVO da sala. Lança Forbidden se não for. */
export async function assertIsMaster(
  pool: Pool,
  roomId: string,
  userId: string,
): Promise<RoomMember> {
  const member = await findActiveMember(pool, roomId, userId);
  if (!member) throw new ForbiddenError('Você não é membro desta sala');
  if (member.role !== 'master') throw new ForbiddenError('Apenas o mestre pode realizar esta ação');
  return member;
}

/** Verifica se o usuário é membro ATIVO da sala. Lança Forbidden se não for. */
export async function assertIsMember(
  pool: Pool,
  roomId: string,
  userId: string,
): Promise<RoomMember> {
  const member = await findActiveMember(pool, roomId, userId);
  if (!member) throw new ForbiddenError('Você não é membro desta sala');
  return member;
}
