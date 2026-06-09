/**
 * Repositório de mensagens (chat).
 *
 * Alinhado à modelagem aprovada:
 *   - `type` ∈ {'text','system'}
 *   - `user_id` NULL em mensagens de sistema
 *   - sem `roll_id` (rolagens são tabela separada, exibidas em union com chat)
 */
import type { Pool, PoolClient } from 'pg';
import type { Message, MessageType } from '../../types/domain.js';

type Executor = Pool | PoolClient;

interface MessageRow {
  id: string;
  room_id: string;
  user_id: string | null;
  type: MessageType;
  content: string;
  created_at: Date;
}

function mapRow(row: MessageRow): Message {
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    type: row.type,
    content: row.content,
    createdAt: row.created_at,
  };
}

export interface InsertMessageInput {
  roomId: string;
  userId: string | null;
  type?: MessageType;
  content: string;
}

export async function insertMessage(
  exec: Executor,
  input: InsertMessageInput,
): Promise<Message> {
  const res = await exec.query<MessageRow>(
    `INSERT INTO messages (room_id, user_id, type, content)
     VALUES ($1, $2, $3, $4)
     RETURNING id, room_id, user_id, type, content, created_at`,
    [input.roomId, input.userId, input.type ?? 'text', input.content],
  );
  const row = res.rows[0];
  if (!row) throw new Error('insertMessage: no row returned');
  return mapRow(row);
}

export interface ListMessagesParams {
  roomId: string;
  before?: Date;
  limit: number;
  type?: MessageType;
}

/** Retorna as mensagens mais recentes de uma sala, em ordem decrescente. */
export async function listMessages(
  exec: Executor,
  params: ListMessagesParams,
): Promise<Message[]> {
  const limit = Math.min(Math.max(params.limit, 1), 200);
  const before = params.before ?? null;
  const type = params.type ?? null;
  const res = await exec.query<MessageRow>(
    `SELECT id, room_id, user_id, type, content, created_at
       FROM messages
      WHERE room_id = $1
        AND ($2::timestamptz IS NULL OR created_at < $2)
        AND ($3::text IS NULL OR type = $3)
      ORDER BY created_at DESC
      LIMIT $4`,
    [params.roomId, before, type, limit],
  );
  return res.rows.map(mapRow);
}
