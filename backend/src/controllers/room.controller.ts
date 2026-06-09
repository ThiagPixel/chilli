/**
 * Room controller — criar, consultar e entrar em salas.
 *
 * POST   /api/rooms                  (autenticado) — cria sala; mestre vira master.
 * GET    /api/rooms/:code            (público)     — info da sala.
 * POST   /api/rooms/:code/join       (autenticado) — entra como player.
 * GET    /api/rooms/:code/members    (autenticado, membro) — lista membros.
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { getPool } from '../database/connection.js';
import {
  createRoom,
  joinRoom,
  getRoomByCode,
  listRoomMembers,
} from '../services/room.service.js';
import { requireAuth, type AuthedRequest } from '../middlewares/requireAuth.js';
import { ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const CODE_RE = /^[A-HJ-NP-Z2-9]{6,8}$/;

const CreateRoomSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).nullable().optional(),
});

const JoinRoomSchema = z.object({
  userId: z.string().uuid().optional(), // opcional — o requireAuth popula req.userId
});

export const roomRouter = Router();

roomRouter.post('/', requireAuth, async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const masterId = req.userId;
    if (!masterId) throw new ValidationError('userId ausente no contexto');

    const parsed = CreateRoomSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Payload inválido', parsed.error.flatten());
    }
    const { name, description } = parsed.data;

    const result = await createRoom(
      getPool(),
      masterId,
      name,
      description ?? null,
    );
    logger.info({ roomId: result.room.id, code: result.room.code, masterId }, 'room.create ok');
    res.status(201).json({ room: result.room, member: result.member });
  } catch (err) {
    next(err);
  }
});

roomRouter.get('/:code', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = String(req.params.code ?? '').toUpperCase();
    if (!CODE_RE.test(code)) {
      throw new ValidationError('Código de sala inválido');
    }
    const room = await getRoomByCode(getPool(), code);
    res.json({ room });
  } catch (err) {
    next(err);
  }
});

roomRouter.post('/:code/join', requireAuth, async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const code = String(req.params.code ?? '').toUpperCase();
    if (!CODE_RE.test(code)) {
      throw new ValidationError('Código de sala inválido');
    }
    const userId = req.userId;
    if (!userId) throw new ValidationError('userId ausente no contexto');

    // body é opcional no MVP
    JoinRoomSchema.safeParse(req.body);

    const result = await joinRoom(getPool(), code, userId);
    logger.info({ roomId: result.room.id, code, userId, alreadyMember: result.alreadyMember }, 'room.join ok');
    res.json({
      room: result.room,
      member: result.member,
      alreadyMember: result.alreadyMember,
    });
  } catch (err) {
    next(err);
  }
});

roomRouter.get(
  '/:code/members',
  requireAuth,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const code = String(req.params.code ?? '').toUpperCase();
      if (!CODE_RE.test(code)) {
        throw new ValidationError('Código de sala inválido');
      }
      const userId = req.userId;
      if (!userId) throw new ValidationError('userId ausente no contexto');

      // Confere que o user é membro
      const room = await getRoomByCode(getPool(), code);
      const members = await listRoomMembers(getPool(), room.id);
      if (!members.some((m: { userId: string }) => m.userId === userId)) {
        // Não é membro — devolve 403 com a forma padrão
        const { ForbiddenError } = await import('../utils/errors.js');
        throw new ForbiddenError('Você não é membro desta sala');
      }

      res.json({ members });
    } catch (err) {
      next(err);
    }
  },
);
