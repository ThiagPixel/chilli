/**
 * Dice controller — histórico de rolagens.
 *
 * GET /api/rooms/:code/rolls?limit=<n>
 *   Auth: requerida + membro.
 *   `limit` opcional, default 50, max 200.
 *   Retorna rolagens em ordem **DESC** (mais nova primeiro),
 *   mesmo formato do store do frontend.
 */
import { Router, type NextFunction, type Response } from 'express';
import { getPool } from '../database/connection.js';
import { findRoomByCode } from '../database/repositories/room.repo.js';
import { getRecentRolls } from '../services/dice.history.service.js';
import { assertIsMember } from '../services/room.service.js';
import { requireAuth, type AuthedRequest } from '../middlewares/requireAuth.js';
import { ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const CODE_RE = /^[A-HJ-NP-Z2-9]{6,8}$/;
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export const diceHistoryRouter = Router();

diceHistoryRouter.get(
  '/:code/rolls',
  requireAuth,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const code = String(req.params.code ?? '').toUpperCase();
      if (!CODE_RE.test(code)) throw new ValidationError('Código de sala inválido');
      const userId = req.userId;
      if (!userId) throw new ValidationError('userId ausente no contexto');

      const limitRaw = typeof req.query['limit'] === 'string'
        ? Number.parseInt(req.query['limit'], 10)
        : DEFAULT_LIMIT;
      const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : DEFAULT_LIMIT, 1), MAX_LIMIT);

      const room = await findRoomByCode(getPool(), code);
      if (!room) throw new ValidationError('Sala não encontrada');
      await assertIsMember(getPool(), room.id, userId);

      const rolls = await getRecentRolls(getPool(), room.id, { limit });
      res.json({ rolls });
    } catch (err) {
      logger.error({ err }, 'dice.history falhou');
      next(err);
    }
  },
);
