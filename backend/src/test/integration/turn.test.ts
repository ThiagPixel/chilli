/**
 * Testes de integração — handler de turnos (turn:start / turn:end).
 *
 * Cobre o bug onde `turn:end` SEMPRE fazia broadcast de
 * `turn:changed` mesmo quando não havia turno ativo. A correção
 * lê o room antes e só broadcasta se havia turno para limpar.
 *
 * Pula graciosamente se o Postgres não estiver disponível.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { getPool, closePool, truncateAll } from '../helpers/db.js';
import { startSocketHarness, type SocketTestHarness, type TestClient } from '../helpers/socket.js';
import { signIn } from '../../services/auth.service.js';
import { createRoom, joinRoom } from '../../services/room.service.js';
import type { AckResult, RoomState } from '../../types/socket-events.js';

let pool: ReturnType<typeof getPool>;
let dbAvailable = false;
let harness: SocketTestHarness | null = null;

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
    if (!harness) harness = await startSocketHarness();
    await fn();
  });

/** Helper: coleta eventos de um cliente por uma janela de tempo. */
function collectEvents<T>(
  client: TestClient,
  event: string,
  durationMs: number,
): Promise<T[]> {
  return new Promise<T[]>((resolve) => {
    const collected: T[] = [];
    const handler = (payload: T): void => {
      collected.push(payload);
    };
    // socket.io-client: `on` aceita string genérico para tipos não mapeados.
    (client.socket.on as unknown as (e: string, h: (p: T) => void) => void)(
      event,
      handler,
    );
    setTimeout(() => {
      (client.socket.off as unknown as (e: string, h: (p: T) => void) => void)(
        event,
        handler,
      );
      resolve(collected);
    }, durationMs);
  });
}

describe('sockets: turn:end', () => {
  beforeEach(async () => {
    if (!dbAvailable) return;
    if (!harness) harness = await startSocketHarness();
    await truncateAll(pool);
  });

  itDb('NÃO broadcasta turn:changed quando não há turno ativo', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');

    const client = await harness!.connectClient(master.user.id);
    try {
      await new Promise<AckResult<RoomState>>((resolve) => {
        client.socket.emit('room:join', { code: room.code }, resolve);
      });

      // Coleta eventos por 250ms — janela suficiente para qualquer
      // broadcast indevido chegar.
      const events = collectEvents<{ currentTurnUserId: string | null; by?: string }>(
        client,
        'turn:changed',
        250,
      );

      client.socket.emit('turn:end', {});

      const received = await events;
      expect(received).toEqual([]);
    } finally {
      client.disconnect();
    }
  });

  itDb('broadcasta turn:changed (null) quando havia turno ativo', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const player = await signIn(pool, { name: 'P1' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');
    await joinRoom(pool, room.code, player.user.id);

    const masterClient = await harness!.connectClient(master.user.id);
    const playerClient = await harness!.connectClient(player.user.id);
    try {
      await new Promise<AckResult<RoomState>>((resolve) => {
        masterClient.socket.emit('room:join', { code: room.code }, resolve);
      });
      await new Promise<AckResult<RoomState>>((resolve) => {
        playerClient.socket.emit('room:join', { code: room.code }, resolve);
      });

      // 1) Inicia turno. Player recebe turn:changed com o targetUserId.
      const startWait = playerClient.waitFor('turn:changed');
      masterClient.socket.emit('turn:start', { targetUserId: player.user.id });
      const startEvent = await startWait;
      expect(startEvent.currentTurnUserId).toBe(player.user.id);

      // 2) Encerra turno. Player deve receber turn:changed com null.
      const endWait = playerClient.waitFor('turn:changed');
      masterClient.socket.emit('turn:end', {});
      const event = await endWait;

      expect(event.currentTurnUserId).toBeNull();
    } finally {
      masterClient.disconnect();
      playerClient.disconnect();
    }
  });
});

// Tipos auxiliares para o linter
void (null as unknown as TestClient);
