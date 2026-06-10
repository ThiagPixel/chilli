/**
 * Message controller — histórico paginado de mensagens.
 *
 * GET /api/rooms/:code/messages?before=<iso>&limit=<n>
 *   Auth: requerida + membro.
 *   `before` (opcional) — cursor ISO; retorna mensagens **anteriores** a ele.
 *   `limit` (opcional, default 50, max 200).
 */
import { Router, type NextFunction, type Response } from 'express';
import { getPool } from '../database/connection.js';
import { findRoomByCode } from '../database/repositories/room.repo.js';
import { getRecentMessages } from '../services/message.service.js';
import { requireAuth, type AuthedRequest } from '../middlewares/requireAuth.js';
import { assertIsMember } from '../services/room.service.js';
import { ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const CODE_RE = /^[A-HJ-NP-Z2-9]{6,8}$/;
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

export const messageRouter = Router();

messageRouter.get(
  '/:code/messages',
  requireAuth,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const code = String(req.params.code ?? '').toUpperCase();
      if (!CODE_RE.test(code)) throw new ValidationError('Código de sala inválido');
      const userId = req.userId;
      if (!userId) throw new ValidationError('userId ausente no contexto');

      const beforeRaw = typeof req.query['before'] === 'string' ? req.query['before'] : undefined;
      const before = beforeRaw ? new Date(beforeRaw) : undefined;
      if (before && Number.isNaN(before.getTime())) {
        throw new ValidationError('Cursor `before` inválido');
      }

      const limitRaw = typeof req.query['limit'] === 'string' ? Number.parseInt(req.query['limit'], 10) : DEFAULT_LIMIT;
      const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : DEFAULT_LIMIT, 1), MAX_LIMIT);

      const room = await findRoomByCode(getPool(), code);
      if (!room) throw new ValidationError('Sala não encontrada');
      await assertIsMember(getPool(), room.id, userId);

      const messages = await getRecentMessages(getPool(), room.id, {
        ...(before ? { before } : {}),
        limit,
      });

      // Devolve em ordem cronológica ASC para o cliente.
      const ordered = [...messages].reverse();
      const nextCursor = ordered.length > 0 ? ordered[0]?.createdAt.toISOString() ?? null : null;

      res.json({ messages: ordered, nextCursor });
    } catch (err) {
      logger.error({ err }, 'message.history falhou');
      next(err);
    }
  },
);
