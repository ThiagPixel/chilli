/**
 * Auth controller — identidade anônima via `deviceId`.
 *
 * POST /api/auth/anonymous
 *   body: { deviceId: string, name: string, avatarUrl?: string|null }
 *   → 201 { user, isNew }
 *   seta cookie httpOnly `chilli_token` com o JWT.
 *
 * GET /api/auth/me
 *   header: Authorization: Bearer <token> OU cookie `chilli_token`
 *   → 200 { user }
 *
 * Para o MVP, o `deviceId` é usado como chave única (mapeado para
 * um email sintético `deviceId@chilli.device` para reaproveitar
 * a constraint UNIQUE do banco). Quando o backend ganhar
 * autenticação OAuth/e-mail real, este controller muda mas a API
 * HTTP permanece compatível.
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPool } from '../database/connection.js';
import { signIn as signInService, getMeById } from '../services/auth.service.js';
import { AUTH_COOKIE_NAME, requireAuth, type AuthedRequest } from '../middlewares/requireAuth.js';
import { ValidationError } from '../utils/errors.js';
import { loadEnv } from '../config/env.js';
import { logger } from '../utils/logger.js';

const SignInSchema = z.object({
  deviceId: z.string().min(1).max(128),
  name: z.string().min(1).max(50),
  avatarUrl: z.union([z.string().url(), z.string().startsWith('data:'), z.null()]).optional(),
});

export const authRouter = Router();

authRouter.post('/anonymous', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = SignInSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Payload inválido', parsed.error.flatten());
    }
    const { deviceId, name, avatarUrl } = parsed.data;

    // Mapeia deviceId → email sintético. Reaproveita a UNIQUE do schema.
    const syntheticEmail = `${deviceId.toLowerCase()}@chilli.device`;

    const result = await signInService(getPool(), {
      name,
      email: syntheticEmail,
      ...(avatarUrl ? { avatarUrl } : {}),
    });

    setAuthCookie(res, result.token);
    logger.info({ userId: result.user.id, isNew: result.isNew }, 'auth.anonymous ok');

    res.status(201).json({
      user: result.user,
      isNew: result.isNew,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) throw new ValidationError('userId ausente no contexto');
    const user = await getMeById(getPool(), userId);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

function setAuthCookie(res: Response, token: string): void {
  const env = loadEnv();
  const isDev = env.NODE_ENV !== 'production';
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !isDev, // em produção, só sobre HTTPS
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 dias
  });
}
