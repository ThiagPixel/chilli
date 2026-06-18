/**
 * Teste de integração: handshake do Socket.IO com NODE_ENV=staging.
 *
 * Regressão: antes do fix, `attachSocketServer` tratava staging como dev
 * (`NODE_ENV !== 'production'`), e a allowlist do CORS rejeitava qualquer
 * origin que não fosse localhost. Esse teste sobe o servidor com
 * `NODE_ENV=staging` e conecta com um Origin externo via polling,
 * confirmando que o handshake passa.
 *
 * Requer Postgres disponível (o `socketAuth` consulta o cookie, que é
 * assinado por `signToken` — então NÃO precisa de DB; mas a flag
 * `dbAvailable` é reaproveitada do padrão dos outros testes de integração
 * para pular graciosamente em ambientes sem DB).
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { getPool, closePool } from '../helpers/db.js';
import { startSocketHarness, type SocketTestHarness } from '../helpers/socket.js';
import { signToken } from '../../utils/jwt.js';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../types/socket-events.js';

let pool: ReturnType<typeof getPool>;
let dbAvailable = false;
let harness: SocketTestHarness | null = null;

const STAGING_ORIGIN = 'https://stg.chilliplay.com.br';

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

function setNodeEnvStaging(): void {
  process.env['NODE_ENV'] = 'staging';
}

function restoreNodeEnv(prev: string | undefined): void {
  if (prev === undefined) delete process.env['NODE_ENV'];
  else process.env['NODE_ENV'] = prev;
}

describe('sockets: CORS com NODE_ENV=staging', () => {
  const prevEnv = process.env['NODE_ENV'];

  beforeEach(() => {
    setNodeEnvStaging();
  });

  afterAll(() => {
    restoreNodeEnv(prevEnv);
    if (harness) {
      void harness.cleanup();
      harness = null;
    }
  });

  it('permite handshake com Origin externo (regressão do bug)', async () => {
    if (!harness) {
      // `startSocketHarness` lê `process.env['NODE_ENV']` ao chamar
      // `attachSocketServer`, então setamos ANTES de subir o harness.
      harness = await startSocketHarness();
    }

    const userId = 'test-user-staging-cors';
    const token = signToken({ sub: userId });

    // Polling transport permite setar Origin via extraHeaders. Em produção
    // o navegador envia Origin no upgrade do WebSocket; em teste simulamos
    // o mesmo cenário pela via HTTP.
    const socket = ioc(harness.url, {
      transports: ['polling'],
      extraHeaders: { Origin: STAGING_ORIGIN },
      reconnection: false,
      // Cookie precisa estar presente para o `socketAuth` passar depois
      // do CORS. Mesmo assim: se o CORS falhar, `connect_error` chega
      // antes do auth.
      transportOptions: {
        polling: {
          extraHeaders: { Cookie: `chilli_token=${token}` },
        },
      },
    }) as unknown as ClientSocket<ServerToClientEvents, ClientToServerEvents>;

    const err = await new Promise<Error | null>((resolve) => {
      socket.once('connect', () => resolve(null));
      socket.once('connect_error', (e: Error) => resolve(e));
      // Timeout curto: se nada acontecer em 3s, considera falha.
      setTimeout(() => resolve(new Error('timeout esperando connect/connect_error')), 3000);
    });

    // Limpa o socket antes de qualquer asserção que possa falhar.
    if (socket.connected) socket.disconnect();

    expect(err).toBeNull();
  });

  it('permite handshake sem Origin (curl, same-origin sem header)', async () => {
    if (!harness) harness = await startSocketHarness();

    const userId = 'test-user-staging-no-origin';
    const token = signToken({ sub: userId });

    const socket = ioc(harness.url, {
      transports: ['polling'],
      reconnection: false,
      transportOptions: {
        polling: {
          extraHeaders: { Cookie: `chilli_token=${token}` },
        },
      },
    }) as unknown as ClientSocket<ServerToClientEvents, ClientToServerEvents>;

    const err = await new Promise<Error | null>((resolve) => {
      socket.once('connect', () => resolve(null));
      socket.once('connect_error', (e: Error) => resolve(e));
      setTimeout(() => resolve(new Error('timeout')), 3000);
    });

    if (socket.connected) socket.disconnect();
    expect(err).toBeNull();
  });
});
