/**
 * Message service — gravação e listagem de mensagens de chat.
 *
 * Alinhado à modelagem aprovada:
 *   - `type` ∈ {'text','system'}
 *   - sem `rollId` (rolagens ficam em `dice_rolls`)
 */
import type { Pool } from 'pg';
import {
  insertMessage,
  listMessages,
  type InsertMessageInput,
  type ListMessagesParams,
} from '../database/repositories/message.repo.js';
import { ValidationError } from '../utils/errors.js';
import { assertIsMember } from './room.service.js';
import type { Message, MessageType } from '../types/domain.js';

const MAX_CONTENT = 2000;

export interface PostMessageInput {
  roomId: string;
  userId: string;
  content: string;
  type?: MessageType;
}

export async function postMessage(
  pool: Pool,
  input: PostMessageInput,
): Promise<Message> {
  const content = input.content?.trim() ?? '';
  if (content.length < 1 || content.length > MAX_CONTENT) {
    throw new ValidationError(`Mensagem deve ter entre 1 e ${MAX_CONTENT} caracteres`);
  }

  // Apenas membros ativos da sala podem postar (mensagens de sistema
  // são responsabilidade do backend, fora deste service).
  await assertIsMember(pool, input.roomId, input.userId);

  const insertInput: InsertMessageInput = {
    roomId: input.roomId,
    userId: input.userId,
    content,
    ...(input.type !== undefined ? { type: input.type } : {}),
  };
  return insertMessage(pool, insertInput);
}

/** Helper para o backend emitir mensagens de sistema (ex.: "Fulano entrou"). */
export async function postSystemMessage(
  pool: Pool,
  roomId: string,
  content: string,
): Promise<Message> {
  const trimmed = content?.trim() ?? '';
  if (trimmed.length < 1 || trimmed.length > MAX_CONTENT) {
    throw new ValidationError(`Mensagem de sistema deve ter entre 1 e ${MAX_CONTENT} caracteres`);
  }
  return insertMessage(pool, { roomId, userId: null, type: 'system', content: trimmed });
}

export async function getRecentMessages(
  pool: Pool,
  roomId: string,
  options: { before?: Date; limit?: number; type?: MessageType } = {},
): Promise<Message[]> {
  const params: ListMessagesParams = {
    roomId,
    limit: options.limit ?? 50,
    ...(options.before ? { before: options.before } : {}),
    ...(options.type ? { type: options.type } : {}),
  };
  return listMessages(pool, params);
}
