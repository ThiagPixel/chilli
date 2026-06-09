/**
 * Auth service — identidade de jogador.
 *
 * No MVP a autenticação é leve:
 *   - Identidade persiste apenas com `name` + `email` opcional.
 *   - Se o `email` já existe, retornamos o user existente (idempotente).
 *   - Se não, criamos um user novo.
 *   - Token JWT carrega apenas `sub` (userId).
 *
 * O fluxo concreto de login (formato do payload HTTP) será definido
 * no passo 3 (API). Este service é a base de domínio.
 */
import type { Pool } from 'pg';
import {
  findUserByEmail,
  findUserById,
  createUser,
  type CreateUserInput,
} from '../database/repositories/user.repo.js';
import { signToken, type JwtPayload } from '../utils/jwt.js';
import { ValidationError } from '../utils/errors.js';
import type { User } from '../types/domain.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SignInInput {
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
}

export interface SignInResult {
  user: User;
  token: string;
  isNew: boolean;
}

export async function signIn(pool: Pool, input: SignInInput): Promise<SignInResult> {
  const name = input.name?.trim() ?? '';
  if (name.length < 1 || name.length > 50) {
    throw new ValidationError('name deve ter entre 1 e 50 caracteres');
  }

  const email = input.email?.trim() || null;
  if (email !== null) {
    if (email.length > 255 || !EMAIL_RE.test(email)) {
      throw new ValidationError('email inválido');
    }
  }

  // Se houver email, tenta localizar usuário existente (identidade estável).
  if (email) {
    const existing = await findUserByEmail(pool, email);
    if (existing) {
      const token = signToken({ sub: existing.id });
      return { user: existing, token, isNew: false };
    }
  }

  const createInput: CreateUserInput = {
    name,
    email,
    ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
  };
  const user = await createUser(pool, createInput);
  const token = signToken({ sub: user.id });
  return { user, token, isNew: true };
}

export async function getMeById(pool: Pool, userId: string): Promise<User> {
  const user = await findUserById(pool, userId);
  if (!user) throw new ValidationError('Usuário não encontrado');
  return user;
}

export type { JwtPayload };
