/**
 * MapToken controller — REST para criar/remover tokens.
 *
 * Movimentação é via socket (`token:move`) para latência baixa. REST
 * só lida com:
 *   - POST   /api/rooms/:code/map/:mapId/tokens  (mestre)
 *   - DELETE /api/rooms/:code/tokens/:tokenId    (mestre ou dono)
 *
 * Após criar, broadcasta `token:created` para a sala inteira (o autor
 * já fez insert otimista no cliente).
 * Após deletar, broadcasta `token:removed`.
 */
import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { getPool } from '../database/connection.js';
import { findRoomByCode } from '../database/repositories/room.repo.js';
import {
  registerMapToken,
  removeMapToken,
} from '../services/mapToken.service.js';
import { requireAuth, type AuthedRequest } from '../middlewares/requireAuth.js';
import { ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { getIO } from '../sockets/ioRef.js';

const CODE_RE = /^[A-HJ-NP-Z2-9]{6,8}$/;
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const CreateTokenSchema = z.object({
  label: z.string().min(1).max(3),
  color: z
    .string()
    .regex(COLOR_RE, 'Cor deve ser #RRGGBB')
    .optional(),
  x: z.number().finite().optional(),
  y: z.number().finite().optional(),
  controllerUserId: z.string().uuid().nullable().optional(),
});

export const mapTokenRouter = Router();

mapTokenRouter.post(
  '/:code/map/:mapId/tokens',
  requireAuth,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const code = String(req.params.code ?? '').toUpperCase();
      if (!CODE_RE.test(code)) throw new ValidationError('Código de sala inválido');
      const mapId = String(req.params.mapId ?? '');
      const userId = req.userId;
      if (!userId) throw new ValidationError('userId ausente no contexto');

      const parsed = CreateTokenSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Payload inválido', parsed.error.flatten());
      }

      const room = await findRoomByCode(getPool(), code);
      if (!room) throw new ValidationError('Sala não encontrada');

      const token = await registerMapToken(getPool(), {
        roomId: room.id,
        mapId,
        masterId: userId,
        label: parsed.data.label,
        ...(parsed.data.color !== undefined ? { color: parsed.data.color } : {}),
        ...(parsed.data.x !== undefined ? { x: parsed.data.x } : {}),
        ...(parsed.data.y !== undefined ? { y: parsed.data.y } : {}),
        ...(parsed.data.controllerUserId !== undefined
          ? { controllerUserId: parsed.data.controllerUserId }
          : {}),
      });

      const io = getIO();
      io?.to(code).emit('token:created', { token });

      logger.info({ roomId: room.id, tokenId: token.id }, 'mapToken.create ok');
      res.status(201).json({ token });
    } catch (err) {
      logger.error({ err }, 'mapToken.create falhou');
      next(err);
    }
  },
);

mapTokenRouter.delete(
  '/:code/tokens/:tokenId',
  requireAuth,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const code = String(req.params.code ?? '').toUpperCase();
      if (!CODE_RE.test(code)) throw new ValidationError('Código de sala inválido');
      const tokenId = String(req.params.tokenId ?? '');
      const userId = req.userId;
      if (!userId) throw new ValidationError('userId ausente no contexto');

      // removeMapToken já valida o roomId via assertIsMaster/owner.
      const removed = await removeMapToken(getPool(), tokenId, userId);

      const io = getIO();
      io?.to(code).emit('token:removed', { tokenId: removed.id });

      res.status(204).end();
    } catch (err) {
      logger.error({ err }, 'mapToken.delete falhou');
      next(err);
    }
  },
);
