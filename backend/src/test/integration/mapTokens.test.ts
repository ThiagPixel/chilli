/**
 * Testes de integração — tokens do mapa + sistema de turnos.
 *
 * Cobre:
 *   - Mestre move token (broadcast `token:moved` para os outros; autor não recebe).
 *   - Dono do token move o próprio token.
 *   - NÃO-dono recebe `error: FORBIDDEN` ao mover token de outro.
 *   - Mestre cria token via REST e broadcasta `token:created`.
 *   - Mestre inicia turno de player; broadcasta `turn:changed`.
 *   - Mestre encerra turno; broadcasta `turn:changed` null.
 *   - Player NÃO-mestre recebe `error: FORBIDDEN` ao tentar `turn:start`.
 *   - Player com turno sai da sala; turno auto-limpa.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { getPool, closePool, truncateAll } from '../helpers/db.js';
import {
  startSocketHarness,
  type SocketTestHarness,
} from '../helpers/socket.js';
import { signIn } from '../../services/auth.service.js';
import { createRoom, joinRoom } from '../../services/room.service.js';
import { registerMap } from '../../services/map.service.js';
import { setCurrentTurn } from '../../database/repositories/room.repo.js';
import { signToken } from '../../utils/jwt.js';
import type { AckResult, RoomState } from '../../types/socket-events.js';
import type { MapToken } from '../../types/domain.js';

let pool: ReturnType<typeof getPool>;
let dbAvailable = false;
let harness: SocketTestHarness | null = null;
let httpHarness: SocketTestHarness | null = null;

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

describe('sockets: token:move', () => {
  beforeEach(async () => {
    if (!dbAvailable) return;
    if (!harness) harness = await startSocketHarness();
    await truncateAll(pool);
  });

  itDb('mestre move token: broadcast token:moved para os outros', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const player = await signIn(pool, { name: 'P1' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');
    await joinRoom(pool, room.code, player.user.id);
    const map = await registerMap(pool, {
      roomId: room.id,
      masterId: master.user.id,
      name: 'M1',
      imageUrl: 'https://example.com/m.png',
      isActive: true,
    });
    const token = await pool.query<MapToken>(
      `INSERT INTO map_tokens (map_id, room_id, label, color, x, y, controller_user_id)
       VALUES ($1, $2, 'N', '#e53935', 0, 0, NULL)
       RETURNING *`,
      [map.id, room.id],
    );
    const tokenId = token.rows[0]!.id;

    const masterClient = await harness!.connectClient(master.user.id);
    const playerClient = await harness!.connectClient(player.user.id);
    try {
      await new Promise<AckResult<RoomState>>((resolve) => {
        masterClient.socket.emit('room:join', { code: room.code }, resolve);
      });
      await new Promise<AckResult<RoomState>>((resolve) => {
        playerClient.socket.emit('room:join', { code: room.code }, resolve);
      });

      const playerWait = playerClient.waitFor('token:moved');
      masterClient.socket.emit('token:move', { tokenId, x: 50, y: 75 });
      const event = await playerWait;

      expect(event.tokenId).toBe(tokenId);
      expect(event.x).toBe(50);
      expect(event.y).toBe(75);
      expect(event.by).toBe(master.user.id);

      const updated = await pool.query<MapToken>(
        `SELECT x, y FROM map_tokens WHERE id = $1`,
        [tokenId],
      );
      expect(updated.rows[0]?.x).toBe(50);
      expect(updated.rows[0]?.y).toBe(75);
    } finally {
      masterClient.disconnect();
      playerClient.disconnect();
    }
  });

  itDb('player NÃO-dono recebe error FORBIDDEN ao mover token de outro', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const p1 = await signIn(pool, { name: 'P1' });
    const p2 = await signIn(pool, { name: 'P2' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');
    await joinRoom(pool, room.code, p1.user.id);
    await joinRoom(pool, room.code, p2.user.id);
    const map = await registerMap(pool, {
      roomId: room.id,
      masterId: master.user.id,
      name: 'M',
      imageUrl: 'https://example.com/m.png',
      isActive: true,
    });
    const t = await pool.query<MapToken>(
      `INSERT INTO map_tokens (map_id, room_id, label, color, x, y, controller_user_id)
       VALUES ($1, $2, 'P1', '#0000ff', 0, 0, $3)
       RETURNING id`,
      [map.id, room.id, p1.user.id],
    );
    const tokenId = t.rows[0]!.id;

    const p2Client = await harness!.connectClient(p2.user.id);
    try {
      await new Promise<AckResult<RoomState>>((resolve) => {
        p2Client.socket.emit('room:join', { code: room.code }, resolve);
      });
      const errWait = p2Client.waitFor('error');
      p2Client.socket.emit('token:move', { tokenId, x: 100, y: 100 });
      const err = await errWait;
      expect(err.code).toBe('FORBIDDEN');
    } finally {
      p2Client.disconnect();
    }
  });

  itDb('dono do token pode mover o próprio token', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const p1 = await signIn(pool, { name: 'P1' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');
    await joinRoom(pool, room.code, p1.user.id);
    const map = await registerMap(pool, {
      roomId: room.id,
      masterId: master.user.id,
      name: 'M',
      imageUrl: 'https://example.com/m.png',
      isActive: true,
    });
    const t = await pool.query<MapToken>(
      `INSERT INTO map_tokens (map_id, room_id, label, color, x, y, controller_user_id)
       VALUES ($1, $2, 'A', '#00ff00', 0, 0, $3)
       RETURNING id`,
      [map.id, room.id, p1.user.id],
    );
    const tokenId = t.rows[0]!.id;

    const p1Client = await harness!.connectClient(p1.user.id);
    try {
      await new Promise<AckResult<RoomState>>((resolve) => {
        p1Client.socket.emit('room:join', { code: room.code }, resolve);
      });
      p1Client.socket.emit('token:move', { tokenId, x: 33, y: 44 });
      // Pequeno delay para o server persistir.
      await new Promise((r) => setTimeout(r, 100));
      const updated = await pool.query<MapToken>(
        `SELECT x, y FROM map_tokens WHERE id = $1`,
        [tokenId],
      );
      expect(updated.rows[0]?.x).toBe(33);
      expect(updated.rows[0]?.y).toBe(44);
    } finally {
      p1Client.disconnect();
    }
  });
});

describe('sockets: turn:start / turn:end', () => {
  beforeEach(async () => {
    if (!dbAvailable) return;
    if (!harness) harness = await startSocketHarness();
    await truncateAll(pool);
  });

  itDb('mestre inicia turno de player: broadcasta turn:changed', async () => {
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

      const masterWait = masterClient.waitFor('turn:changed');
      const playerWait = playerClient.waitFor('turn:changed');
      masterClient.socket.emit('turn:start', { targetUserId: player.user.id });

      const masterEvent = await masterWait;
      const playerEvent = await playerWait;
      expect(masterEvent.currentTurnUserId).toBe(player.user.id);
      expect(masterEvent.by).toBe(master.user.id);
      expect(playerEvent.currentTurnUserId).toBe(player.user.id);

      const r = await pool.query<{ current_turn_user_id: string | null }>(
        `SELECT current_turn_user_id FROM rooms WHERE id = $1`,
        [room.id],
      );
      expect(r.rows[0]?.current_turn_user_id).toBe(player.user.id);
    } finally {
      masterClient.disconnect();
      playerClient.disconnect();
    }
  });

  itDb('mestre encerra turno: broadcasta turn:changed null', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const player = await signIn(pool, { name: 'P1' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');
    await joinRoom(pool, room.code, player.user.id);
    await setCurrentTurn(pool, room.id, player.user.id);

    const masterClient = await harness!.connectClient(master.user.id);
    const playerClient = await harness!.connectClient(player.user.id);
    try {
      await new Promise<AckResult<RoomState>>((resolve) => {
        masterClient.socket.emit('room:join', { code: room.code }, resolve);
      });
      await new Promise<AckResult<RoomState>>((resolve) => {
        playerClient.socket.emit('room:join', { code: room.code }, resolve);
      });

      const masterWait = masterClient.waitFor('turn:changed');
      masterClient.socket.emit('turn:end', {});
      const ev = await masterWait;
      expect(ev.currentTurnUserId).toBeNull();
    } finally {
      masterClient.disconnect();
      playerClient.disconnect();
    }
  });

  itDb('player NÃO-mestre recebe error FORBIDDEN ao tentar turn:start', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const p1 = await signIn(pool, { name: 'P1' });
    const p2 = await signIn(pool, { name: 'P2' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');
    await joinRoom(pool, room.code, p1.user.id);
    await joinRoom(pool, room.code, p2.user.id);

    const p1Client = await harness!.connectClient(p1.user.id);
    try {
      await new Promise<AckResult<RoomState>>((resolve) => {
        p1Client.socket.emit('room:join', { code: room.code }, resolve);
      });
      const errWait = p1Client.waitFor('error');
      p1Client.socket.emit('turn:start', { targetUserId: p2.user.id });
      const err = await errWait;
      expect(err.code).toBe('FORBIDDEN');
    } finally {
      p1Client.disconnect();
    }
  });

  itDb('player com turno sai da sala: turno auto-limpa e broadcasta turn:changed null', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const player = await signIn(pool, { name: 'P1' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');
    await joinRoom(pool, room.code, player.user.id);
    await setCurrentTurn(pool, room.id, player.user.id);

    const masterClient = await harness!.connectClient(master.user.id);
    const playerClient = await harness!.connectClient(player.user.id);
    try {
      await new Promise<AckResult<RoomState>>((resolve) => {
        masterClient.socket.emit('room:join', { code: room.code }, resolve);
      });
      await new Promise<AckResult<RoomState>>((resolve) => {
        playerClient.socket.emit('room:join', { code: room.code }, resolve);
      });

      const masterWait = masterClient.waitFor('turn:changed');
      playerClient.disconnect();
      const ev = await masterWait;
      expect(ev.currentTurnUserId).toBeNull();

      const r = await pool.query<{ current_turn_user_id: string | null }>(
        `SELECT current_turn_user_id FROM rooms WHERE id = $1`,
        [room.id],
      );
      expect(r.rows[0]?.current_turn_user_id).toBeNull();
    } finally {
      masterClient.disconnect();
    }
  });
});

describe('REST: /api/rooms/:code/map/:mapId/tokens', () => {
  beforeEach(async () => {
    if (!dbAvailable) return;
    httpHarness = await startSocketHarness({ withHttp: true });
    await truncateAll(pool);
  });

  afterEach(async () => {
    if (httpHarness) {
      await httpHarness.cleanup();
      httpHarness = null;
    }
  });

  itDb('mestre cria token via REST e broadcasta token:created', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');
    const map = await registerMap(pool, {
      roomId: room.id,
      masterId: master.user.id,
      name: 'M',
      imageUrl: 'https://example.com/m.png',
      isActive: true,
    });

    const masterClient = await httpHarness!.connectClient(master.user.id);
    try {
      await new Promise<AckResult<RoomState>>((resolve) => {
        masterClient.socket.emit('room:join', { code: room.code }, resolve);
      });

      const created = masterClient.waitFor('token:created');
      const res = await fetch(
        `${httpHarness!.url}/api/rooms/${room.code}/map/${map.id}/tokens`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `chilli_token=${signToken({ sub: master.user.id })}`,
          },
          body: JSON.stringify({ label: 'G', color: '#00ff00' }),
        },
      );
      expect(res.status).toBe(201);
      const json = (await res.json()) as { token: MapToken };
      expect(json.token.label).toBe('G');
      expect(json.token.color).toBe('#00ff00');

      const event = await created;
      expect(event.token.label).toBe('G');
    } finally {
      masterClient.disconnect();
    }
  });
});
