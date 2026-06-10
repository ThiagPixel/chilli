/**
 * Sheet controller — fichas (characters) por sala.
 *
 * GET   /api/rooms/:code/characters       (membro)  — lista da sala
 * POST  /api/rooms/:code/characters       (membro)  — cria/atualiza minha ficha
 * PATCH /api/characters/:id               (dono)    — atualiza parcial
 */
import { Router, type NextFunction, type Response } from 'express';
import { z } from 'zod';
import { getPool } from '../database/connection.js';
import { findRoomByCode } from '../database/repositories/room.repo.js';
import {
  saveCharacter,
  getMyCharacter,
  listRoomCharacters,
  updateCharacter,
} from '../services/sheet.service.js';
import { assertIsMember } from '../services/room.service.js';
import { requireAuth, type AuthedRequest } from '../middlewares/requireAuth.js';
import { ValidationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const CODE_RE = /^[A-HJ-NP-Z2-9]{6,8}$/;

const UpsertSchema = z.object({
  name: z.string().min(1).max(100),
  data: z.record(z.unknown()),
});

const PatchSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    data: z.record(z.unknown()).optional(),
  })
  .refine((v) => v.name !== undefined || v.data !== undefined, {
    message: 'Patch vazio',
  });

export const sheetRouter = Router();

sheetRouter.get(
  '/:code/characters',
  requireAuth,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const code = String(req.params.code ?? '').toUpperCase();
      if (!CODE_RE.test(code)) throw new ValidationError('Código de sala inválido');
      const userId = req.userId;
      if (!userId) throw new ValidationError('userId ausente no contexto');

      const room = await findRoomByCode(getPool(), code);
      if (!room) throw new ValidationError('Sala não encontrada');
      await assertIsMember(getPool(), room.id, userId);

      const characters = await listRoomCharacters(getPool(), room.id);
      res.json({ characters });
    } catch (err) {
      logger.error({ err }, 'sheet.list falhou');
      next(err);
    }
  },
);

sheetRouter.post(
  '/:code/characters',
  requireAuth,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const code = String(req.params.code ?? '').toUpperCase();
      if (!CODE_RE.test(code)) throw new ValidationError('Código de sala inválido');
      const userId = req.userId;
      if (!userId) throw new ValidationError('userId ausente no contexto');

      const parsed = UpsertSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Payload inválido', parsed.error.flatten());
      }
      const { name, data } = parsed.data;

      const room = await findRoomByCode(getPool(), code);
      if (!room) throw new ValidationError('Sala não encontrada');
      await assertIsMember(getPool(), room.id, userId);

      const existing = await getMyCharacter(getPool(), room.id, userId);
      const character = existing
        ? await updateCharacter(getPool(), existing.id, userId, { name, data })
        : await saveCharacter(getPool(), { roomId: room.id, userId, name, data });

      logger.info({ roomId: room.id, userId, characterId: character.id, updated: Boolean(existing) }, 'sheet.upsert ok');
      res.status(existing ? 200 : 201).json({ character });
    } catch (err) {
      logger.error({ err }, 'sheet.upsert falhou');
      next(err);
    }
  },
);

sheetRouter.patch(
  '/characters/:id',
  requireAuth,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id ?? '');
      if (!id) throw new ValidationError('ID ausente');
      const userId = req.userId;
      if (!userId) throw new ValidationError('userId ausente no contexto');

      const parsed = PatchSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Payload inválido', parsed.error.flatten());
      }

      const character = await updateCharacter(getPool(), id, userId, parsed.data);
      res.json({ character });
    } catch (err) {
      logger.error({ err }, 'sheet.patch falhou');
      next(err);
    }
  },
);
