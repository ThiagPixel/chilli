/**
 * Testes de integração dos handlers Socket.IO.
 *
 * Cobre:
 *   - `room:join` devolve o `RoomState` via ack e faz broadcast de
 *     `room:user_joined` para os demais.
 *   - `chat:send` persiste a mensagem e a entrega a TODOS os membros
 *     (incluindo o autor).
 *   - `dice:roll` parseia, persiste e entrega via `dice:result`.
 *
 * Pula graciosamente se o Postgres não estiver disponível.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { getPool, closePool, truncateAll } from '../helpers/db.js';
import { startSocketHarness, type SocketTestHarness, type TestClient } from '../helpers/socket.js';
import { signIn } from '../../services/auth.service.js';
import { createRoom, joinRoom } from '../../services/room.service.js';
import type { AckResult, RoomState } from '../../types/socket-events.js';
import type { Message, DiceRoll } from '../../types/domain.js';

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
    if (!harness) {
      harness = await startSocketHarness();
    }
    await fn();
  });

describe('sockets: room:join', () => {
  beforeEach(async () => {
    if (!dbAvailable) return;
    if (!harness) harness = await startSocketHarness();
    await truncateAll(pool);
  });

  afterEach(async () => {
    // nada para limpar — harness é reutilizado entre testes
  });

  itDb('devolve RoomState via ack', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa do Socket');

    const client = await harness!.connectClient(master.user.id);
    try {
      const ack = await new Promise<AckResult<RoomState>>((resolve) => {
        client.socket.emit('room:join', { code: room.code }, resolve);
      });
      expect(ack.ok).toBe(true);
      expect(ack.data?.room.id).toBe(room.id);
      expect(ack.data?.members).toHaveLength(1);
      expect(ack.data?.members[0]?.user.id).toBe(master.user.id);
    } finally {
      client.disconnect();
    }
  });

  itDb('broadcast room:user_joined para o segundo membro', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const player = await signIn(pool, { name: 'P1' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');
    await joinRoom(pool, room.code, player.user.id);

    const masterClient = await harness!.connectClient(master.user.id);
    const playerClient = await harness!.connectClient(player.user.id);

    try {
      // Master entra primeiro.
      const masterAck = await new Promise<AckResult<RoomState>>((resolve) => {
        masterClient.socket.emit('room:join', { code: room.code }, resolve);
      });
      expect(masterAck.ok).toBe(true);

      // Player entra — master deve receber room:user_joined.
      const joinP = masterClient.waitFor('room:user_joined');
      const playerAck = await new Promise<AckResult<RoomState>>((resolve) => {
        playerClient.socket.emit('room:join', { code: room.code }, resolve);
      });
      const event = await joinP;
      expect(playerAck.ok).toBe(true);
      expect(event.user.id).toBe(player.user.id);
      expect(event.role).toBe('player');
    } finally {
      masterClient.disconnect();
      playerClient.disconnect();
    }
  });

  itDb('rejeita entrada de não-membro', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const stranger = await signIn(pool, { name: 'X' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');

    const client = await harness!.connectClient(stranger.user.id);
    try {
      const ack = await new Promise<AckResult<RoomState>>((resolve) => {
        client.socket.emit('room:join', { code: room.code }, resolve);
      });
      expect(ack.ok).toBe(false);
      expect(ack.error?.code).toBe('FORBIDDEN');
    } finally {
      client.disconnect();
    }
  });
});

describe('sockets: chat:send', () => {
  beforeEach(async () => {
    if (!dbAvailable) return;
    if (!harness) harness = await startSocketHarness();
    await truncateAll(pool);
  });

  itDb('persiste e entrega via chat:message para todos', async () => {
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

      // Listener que captura todas as mensagens de chat e resolve
      // quando encontrar uma com o conteúdo esperado (filtra o
      // system message "X entrou na sala", que é entregue antes).
      const waitForChatContent = (
        client: TestClient,
        content: string,
      ): Promise<Message> =>
        new Promise<Message>((resolve) => {
          const onMsg = (msg: Message): void => {
            if (msg.content === content) {
              client.socket.off('chat:message', onMsg);
              resolve(msg);
            }
          };
          client.socket.on('chat:message', onMsg);
        });

      const masterWait = waitForChatContent(masterClient, 'olá mesa');
      const playerWait = waitForChatContent(playerClient, 'olá mesa');

      const ack = await new Promise<AckResult<Message>>((resolve) => {
        playerClient.socket.emit('chat:send', { body: 'olá mesa' }, resolve);
      });

      const masterMsg = await masterWait;
      const playerMsg = await playerWait;
      const persisted = ack.data;

      expect(ack.ok).toBe(true);
      expect(persisted?.content).toBe('olá mesa');
      expect(persisted?.userId).toBe(player.user.id);
      expect(masterMsg.content).toBe('olá mesa');
      expect(playerMsg.content).toBe('olá mesa');
    } finally {
      masterClient.disconnect();
      playerClient.disconnect();
    }
  });

  itDb('rejeita body vazio', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');
    const client = await harness!.connectClient(master.user.id);
    try {
      await new Promise<AckResult<RoomState>>((resolve) => {
        client.socket.emit('room:join', { code: room.code }, resolve);
      });
      const ack = await new Promise<AckResult<Message>>((resolve) => {
        client.socket.emit('chat:send', { body: '   ' }, resolve);
      });
      expect(ack.ok).toBe(false);
    } finally {
      client.disconnect();
    }
  });
});

describe('sockets: dice:roll', () => {
  beforeEach(async () => {
    if (!dbAvailable) return;
    if (!harness) harness = await startSocketHarness();
    await truncateAll(pool);
  });

  itDb('rola 1d20, persiste e entrega', async () => {
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

      const masterWait = masterClient.waitFor('dice:result');
      const ack = await new Promise<AckResult<DiceRoll>>((resolve) => {
        playerClient.socket.emit('dice:roll', { expression: '1d20' }, resolve);
      });
      const result = await masterWait;

      expect(ack.ok).toBe(true);
      expect(ack.data?.rolls).toHaveLength(1);
      const r0 = ack.data?.rolls[0] ?? 0;
      expect(r0).toBeGreaterThanOrEqual(1);
      expect(r0).toBeLessThanOrEqual(20);
      expect(result.rolls).toHaveLength(1);
    } finally {
      masterClient.disconnect();
      playerClient.disconnect();
    }
  });

  itDb('rejeita expressão inválida', async () => {
    const master = await signIn(pool, { name: 'Mestre' });
    const { room } = await createRoom(pool, master.user.id, 'Mesa');
    const client = await harness!.connectClient(master.user.id);
    try {
      await new Promise<AckResult<RoomState>>((resolve) => {
        client.socket.emit('room:join', { code: room.code }, resolve);
      });
      const ack = await new Promise<AckResult<DiceRoll>>((resolve) => {
        client.socket.emit('dice:roll', { expression: 'banana' }, resolve);
      });
      expect(ack.ok).toBe(false);
    } finally {
      client.disconnect();
    }
  });
});

// Tipos auxiliares para o linter
void (null as unknown as TestClient);
