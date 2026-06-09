import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { getPool, closePool, truncateAll } from '../helpers/db.js';
import {
  createRoom,
  joinRoom,
  getRoomByCode,
  listRoomMembers,
  leaveRoom,
  assertIsMaster,
  assertIsMember,
} from '../../services/room.service.js';
import { signIn } from '../../services/auth.service.js';
import { findUserByEmail } from '../../database/repositories/user.repo.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../utils/errors.js';
import type { Pool } from 'pg';

let pool: Pool;
let dbAvailable = false;

beforeAll(async () => {
  pool = getPool();
  try {
    await pool.query('SELECT 1');
    dbAvailable = true;
  } catch {
    dbAvailable = false;
  }
});

afterAll(async () => {
  if (dbAvailable) await closePool();
});

const itDb = (name: string, fn: () => Promise<void>): void =>
  it(name, async () => {
    if (!dbAvailable) {
      console.warn('[skip] Postgres indisponível — defina DATABASE_URL');
      return;
    }
    await fn();
  });

describe('room.service', () => {
  beforeEach(async () => {
    if (dbAvailable) await truncateAll(pool);
  });

  itDb('createRoom gera código único e adiciona master como master', async () => {
    const { user } = await signIn(pool, { name: 'Mestre', email: 'gm@x.com' });

    const { room, member } = await createRoom(pool, user.id, 'Mesa do Mestre');

    expect(room.code).toHaveLength(8);
    expect(room.masterId).toBe(user.id);
    expect(room.name).toBe('Mesa do Mestre');
    expect(member.role).toBe('master');
    expect(member.userId).toBe(user.id);
  });

  itDb('createRoom aceita description', async () => {
    const { user } = await signIn(pool, { name: 'Mestre' });
    const { room } = await createRoom(pool, user.id, 'Mesa', 'Uma mesa de teste');
    expect(room.description).toBe('Uma mesa de teste');
  });

  itDb('createRoom rejeita nome vazio', async () => {
    const { user } = await signIn(pool, { name: 'Mestre' });
    await expect(createRoom(pool, user.id, '')).rejects.toBeInstanceOf(ValidationError);
  });

  itDb('joinRoom adiciona jogador como player', async () => {
    const master = await signIn(pool, { name: 'Mestre', email: 'm@x.com' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');

    const player = await signIn(pool, { name: 'P1', email: 'p1@x.com' });
    const joined = await joinRoom(pool, room.code, player.user.id);

    expect(joined.member.role).toBe('player');
    expect(joined.alreadyMember).toBe(false);
    expect(joined.room.id).toBe(room.id);
  });

  itDb('joinRoom é idempotente (membro ativo)', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');
    const player = await signIn(pool, { name: 'P1' });

    const first = await joinRoom(pool, room.code, player.user.id);
    const second = await joinRoom(pool, room.code, player.user.id);
    expect(second.alreadyMember).toBe(true);
    expect(second.member.role).toBe(first.member.role);
  });

  itDb('joinRoom reabre membership após leave', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');
    const player = await signIn(pool, { name: 'P1' });

    await joinRoom(pool, room.code, player.user.id);
    await leaveRoom(pool, room.id, player.user.id);
    const rejoined = await joinRoom(pool, room.code, player.user.id);
    expect(rejoined.alreadyMember).toBe(false);
    expect(rejoined.member.role).toBe('player');
  });

  itDb('joinRoom em código inexistente lança NotFoundError', async () => {
    const { user } = await signIn(pool, { name: 'X' });
    await expect(joinRoom(pool, 'ZZZZZZZZ', user.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  itDb('joinRoom em sala fechada lança ConflictError', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');
    await pool.query(`UPDATE rooms SET status = 'closed' WHERE id = $1`, [room.id]);
    const player = await signIn(pool, { name: 'P1' });
    await expect(joinRoom(pool, room.code, player.user.id)).rejects.toBeInstanceOf(ConflictError);
  });

  itDb('getRoomByCode retorna sala existente', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');
    const fetched = await getRoomByCode(pool, room.code);
    expect(fetched.id).toBe(room.id);
  });

  itDb('códigos de salas diferentes são únicos', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const codes = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const { room } = await createRoom(pool, master.user.id, `Mesa ${i}`);
      codes.add(room.code);
    }
    expect(codes.size).toBe(20);
  });

  itDb('listRoomMembers retorna apenas membros ativos', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');
    const p1 = await signIn(pool, { name: 'P1' });
    const p2 = await signIn(pool, { name: 'P2' });

    await joinRoom(pool, room.code, p1.user.id);
    await joinRoom(pool, room.code, p2.user.id);
    await leaveRoom(pool, room.id, p1.user.id);

    const members = await listRoomMembers(pool, room.id);
    const ids = members.map((m) => m.userId).sort();
    expect(ids).toEqual([master.user.id, p2.user.id].sort());
  });

  itDb('assertIsMaster falha com ForbiddenError se for player', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');
    const p1 = await signIn(pool, { name: 'P1' });
    await joinRoom(pool, room.code, p1.user.id);
    await expect(assertIsMaster(pool, room.id, p1.user.id)).rejects.toBeInstanceOf(ForbiddenError);
  });

  itDb('assertIsMember falha com ForbiddenError se não for membro', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');
    const stranger = await signIn(pool, { name: 'X' });
    await expect(assertIsMember(pool, room.id, stranger.user.id)).rejects.toBeInstanceOf(ForbiddenError);
  });

  itDb('encontra user criado via signIn', async () => {
    const { user, isNew } = await signIn(pool, { name: 'Reuse', email: 'r@x.com' });
    expect(isNew).toBe(true);

    const same = await findUserByEmail(pool, 'r@x.com');
    expect(same?.id).toBe(user.id);
  });
});
