/**
 * Helpers para testes de integração do Socket.IO.
 *
 * Sobe um `httpServer` + `attachSocketServer` numa porta aleatória
 * e devolve a URL. Opcionalmente anexa o app Express na mesma porta
 * (`withHttp: true`) para que os testes possam exercitar endpoints
 * REST além dos sockets.
 */
import { createServer, type Server as HttpServer } from 'node:http';
import { type AddressInfo } from 'node:net';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import { attachSocketServer, type ChilliIo } from '../../sockets/index.js';
import { signToken } from '../../utils/jwt.js';
import type { ServerToClientEvents, ClientToServerEvents } from '../../types/socket-events.js';

export interface SocketTestHarness {
  httpServer: HttpServer;
  io: ChilliIo;
  url: string;
  connectClient: (userId: string) => Promise<TestClient>;
  cleanup: () => Promise<void>;
}

export interface TestClient {
  socket: ClientSocket<ServerToClientEvents, ClientToServerEvents>;
  disconnect: () => void;
  /** Espera por uma Promise que resolve quando o evento `event` chegar. */
  waitFor: <E extends keyof ServerToClientEvents>(event: E) => Promise<Parameters<ServerToClientEvents[E]>[0]>;
}

export interface StartSocketHarnessOptions {
  /** Se true, anexa o app Express no mesmo httpServer (REST disponível). */
  withHttp?: boolean;
}

export async function startSocketHarness(
  options: StartSocketHarnessOptions = {},
): Promise<SocketTestHarness> {
  const httpServer = createServer();

  if (options.withHttp) {
    // Import dinâmico para não puxar o Express nos testes que só usam socket.
    const { createApp } = await import('../../app.js');
    const app = createApp();
    // O app do Express precisa do `setIO` configurado para os broadcasts.
    // `attachSocketServer` chama `setIO(io)` internamente, então chamamos
    // ele DEPOIS de anexar as rotas. Mas o Express também precisa lidar
    // com HTTP request, então o handler é o próprio `app`.
    // Truque: redireciona todas as requests HTTP pro app, exceto as
    // do namespace /socket.io (que o Engine.IO cuida).
    const expressApp = app;
    httpServer.on('request', (req, res) => {
      // /socket.io é tratado pelo Engine.IO; pula o express.
      if (req.url?.startsWith('/socket.io')) return;
      expressApp(req, res);
    });
  }

  const io = attachSocketServer(httpServer);

  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const addr = httpServer.address() as AddressInfo;
  const url = `http://127.0.0.1:${addr.port}`;

  const clients: ClientSocket[] = [];

  function connectClient(userId: string): Promise<TestClient> {
    const token = signToken({ sub: userId });
    const socket = ioc(url, {
      transports: ['websocket'],
      extraHeaders: { Cookie: `chilli_token=${token}` },
      reconnection: false,
    }) as unknown as ClientSocket<ServerToClientEvents, ClientToServerEvents>;

    clients.push(socket as unknown as ClientSocket);

    return new Promise<TestClient>((resolve, reject) => {
      const onConnect = (): void => {
        socket.off('connect_error', onError);
        resolve(makeClient(socket));
      };
      const onError = (err: Error): void => {
        socket.off('connect', onConnect);
        reject(err);
      };
      socket.once('connect', onConnect);
      socket.once('connect_error', onError);
    });
  }

  function makeClient(socket: ClientSocket<ServerToClientEvents, ClientToServerEvents>): TestClient {
    return {
      socket,
      disconnect: () => {
        if (socket.connected) socket.disconnect();
      },
      waitFor: <E extends keyof ServerToClientEvents>(event: E) =>
        new Promise<Parameters<ServerToClientEvents[E]>[0]>((resolve) => {
          socket.once(event, ((arg: Parameters<ServerToClientEvents[E]>[0]) => resolve(arg)) as never);
        }),
    };
  }

  async function cleanup(): Promise<void> {
    for (const c of clients) {
      if (c.connected) c.disconnect();
    }
    io.close();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  }

  return { httpServer, io, url, connectClient, cleanup };
}
