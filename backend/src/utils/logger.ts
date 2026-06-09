/**
 * Logger central baseado em Pino.
 * JSON em produção; pretty em desenvolvimento.
 *
 * Inicialização lazy: `loadEnv()` só é chamado na primeira leitura
 * de `logger`. Isso permite que testes (cujo setup injeta env depois
 * dos imports) configurem as variáveis antes do logger ser instanciado.
 */
import pino, { type Logger as PinoLogger } from 'pino';
import { loadEnv } from '../config/env.js';

let cached: PinoLogger | null = null;

function build(): PinoLogger {
  const env = loadEnv();
  const isDev = env.NODE_ENV === 'development';
  return pino({
    level: env.LOG_LEVEL,
    base: { service: 'chilli-backend' },
    ...(isDev
      ? {
          transport: {
            target: 'pino-pretty',
            options: { colorize: true, translateTime: 'HH:MM:ss.l' },
          },
        }
      : {}),
  });
}

/** Proxy que materializa o logger sob demanda. */
export const logger: PinoLogger = new Proxy({} as PinoLogger, {
  get(_target, prop, receiver) {
    if (!cached) cached = build();
    return Reflect.get(cached, prop, receiver);
  },
});

/** Reseta o cache (usado em testes que mudam env). */
export function resetLoggerCache(): void {
  cached = null;
}

export type Logger = PinoLogger;
