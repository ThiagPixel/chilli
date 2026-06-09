/**
 * Validação de variáveis de ambiente.
 * Chamado uma única vez no boot; falha rápido se algo crítico faltar.
 */
import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL é obrigatório')
    .refine((v) => v.startsWith('postgres://') || v.startsWith('postgresql://'), {
      message: 'DATABASE_URL deve começar com postgres:// ou postgresql://',
    }),

  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET deve ter ao menos 32 caracteres'),
  JWT_EXPIRES_IN: z.string().default('30d'),

  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(10),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  if (cached) return cached;

  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    console.error(`\n[env] Variáveis inválidas:\n${issues}\n`);
    throw new Error('Invalid environment variables');
  }

  cached = result.data;
  return cached;
}

/** Reseta o cache (usado em testes). */
export function resetEnvCache(): void {
  cached = null;
}
