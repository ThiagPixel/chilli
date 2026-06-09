/**
 * Repositório de usuários.
 * Funções puras: recebem `Pool` (injetado) + params, retornam tipos de domínio.
 *
 * Alinhado à modelagem aprovada: identificação por `email` opcional
 * (não mais `device_id`).
 */
import type { Pool, PoolClient } from 'pg';
import type { User } from '../../types/domain.js';

type Executor = Pool | PoolClient;

interface UserRow {
  id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findUserById(exec: Executor, id: string): Promise<User | null> {
  const res = await exec.query<UserRow>(
    'SELECT id, name, email, avatar_url, created_at, updated_at FROM users WHERE id = $1',
    [id],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function findUserByEmail(exec: Executor, email: string): Promise<User | null> {
  const res = await exec.query<UserRow>(
    'SELECT id, name, email, avatar_url, created_at, updated_at FROM users WHERE email = $1',
    [email],
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export interface CreateUserInput {
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
}

export async function createUser(exec: Executor, input: CreateUserInput): Promise<User> {
  const res = await exec.query<UserRow>(
    `INSERT INTO users (name, email, avatar_url)
     VALUES ($1, $2, $3)
     RETURNING id, name, email, avatar_url, created_at, updated_at`,
    [input.name, input.email ?? null, input.avatarUrl ?? null],
  );
  const row = res.rows[0];
  if (!row) throw new Error('createUser: no row returned');
  return mapRow(row);
}

export interface UpdateUserInput {
  name?: string;
  avatarUrl?: string | null;
  email?: string | null;
}

export async function updateUser(
  exec: Executor,
  id: string,
  patch: UpdateUserInput,
): Promise<User> {
  const res = await exec.query<UserRow>(
    `UPDATE users
        SET name       = COALESCE($2, name),
            avatar_url = COALESCE($3, avatar_url),
            email      = COALESCE($4, email),
            updated_at = now()
      WHERE id = $1
      RETURNING id, name, email, avatar_url, created_at, updated_at`,
    [id, patch.name ?? null, patch.avatarUrl ?? null, patch.email ?? null],
  );
  const row = res.rows[0];
  if (!row) throw new Error(`updateUser: user ${id} not found`);
  return mapRow(row);
}
