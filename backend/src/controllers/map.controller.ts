/**
 * Map controller — upload, listagem e ativação de mapas.
 *
 * GET   /api/rooms/:code/maps               (membro)
 * POST  /api/rooms/:code/map                (mestre, multipart)
 * POST  /api/rooms/:code/map/:mapId/active  (mestre) — ativa um mapa já enviado
 * DELETE /api/rooms/:code/map/active        (mestre) — desativa o mapa ativo
 *
 * O upload escreve no disco em `${UPLOAD_DIR}/rooms/<code>/<uuid>.<ext>`
 * e a `imageUrl` devolvida é um path `/uploads/rooms/...` que o Nginx
 * serve em produção. Em dev, o frontend usa o proxy do Vite.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { Router, type NextFunction, type Request, type Response } from 'express';
import multer, { type FileFilterCallback } from 'multer';
import { z } from 'zod';
import { getPool } from '../database/connection.js';
import { findRoomByCode } from '../database/repositories/room.repo.js';
import {
  registerMap,
  listRoomMaps,
  activateRoomMap,
  deactivateActiveRoomMap,
  validateUpload,
} from '../services/map.service.js';
import { requireAuth, type AuthedRequest } from '../middlewares/requireAuth.js';
import { loadEnv } from '../config/env.js';
import { ValidationError, ForbiddenError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const CODE_RE = /^[A-HJ-NP-Z2-9]{6,8}$/;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp']);

const UploadSchema = z.object({
  name: z.string().min(1).max(100),
  isActive: z
    .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
    .optional()
    .transform((v) => v === 'true' || v === '1'),
});

const ActiveMapSchema = z.object({
  mapId: z.string().uuid(),
});

export const mapRouter = Router();

// multer com memória (limite pequeno) + filtro de mime.
const env = () => loadEnv();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env().MAX_UPLOAD_MB * 1024 * 1024 },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error(`Tipo não suportado: ${file.mimetype}`));
  },
});

mapRouter.get(
  '/:code/maps',
  requireAuth,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const code = String(req.params.code ?? '').toUpperCase();
      if (!CODE_RE.test(code)) throw new ValidationError('Código de sala inválido');
      const userId = req.userId;
      if (!userId) throw new ValidationError('userId ausente no contexto');

      const room = await findRoomByCode(getPool(), code);
      if (!room) throw new ValidationError('Sala não encontrada');
      await assertMember(room.id, userId);

      const maps = await listRoomMaps(getPool(), room.id);
      res.json({ maps });
    } catch (err) {
      logger.error({ err }, 'map.list falhou');
      next(err);
    }
  },
);

mapRouter.post(
  '/:code/map',
  requireAuth,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        const msg = err instanceof Error ? err.message : 'Upload inválido';
        next(new ValidationError(msg));
        return;
      }
      next();
    });
  },
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const code = String(req.params.code ?? '').toUpperCase();
      if (!CODE_RE.test(code)) throw new ValidationError('Código de sala inválido');
      const userId = req.userId;
      if (!userId) throw new ValidationError('userId ausente no contexto');

      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file) throw new ValidationError('Arquivo ausente (campo "file")');

      const parsed = UploadSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Payload inválido', parsed.error.flatten());
      }
      const { name, isActive } = parsed.data;

      const e = env();
      const v = validateUpload(file.mimetype, file.size, e.MAX_UPLOAD_MB * 1024 * 1024);
      if (!v.ok) throw new ValidationError(v.reason);

      const room = await findRoomByCode(getPool(), code);
      if (!room) throw new ValidationError('Sala não encontrada');
      // Apenas o mestre pode subir mapa.
      const { assertIsMaster } = await import('../services/room.service.js');
      await assertIsMaster(getPool(), room.id, userId);

      // Grava o arquivo em disco.
      const dir = join(e.UPLOAD_DIR, 'rooms', code);
      await mkdir(dir, { recursive: true });
      const id = randomUUID();
      const ext = extname(file.originalname) || mimeToExt(file.mimetype);
      const filename = `${id}${ext}`;
      await writeFile(join(dir, filename), file.buffer);

      // imageUrl é servida pelo Nginx em /uploads/*.
      const imageUrl = `/uploads/rooms/${code}/${filename}`;

      const map = await registerMap(getPool(), {
        roomId: room.id,
        masterId: userId,
        name,
        imageUrl,
        isActive: isActive ?? false,
      });

      logger.info({ roomId: room.id, mapId: map.id, size: file.size }, 'map.upload ok');
      res.status(201).json({ map });
    } catch (err) {
      logger.error({ err }, 'map.upload falhou');
      next(err);
    }
  },
);

mapRouter.post(
  '/:code/map/:mapId/active',
  requireAuth,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const code = String(req.params.code ?? '').toUpperCase();
      if (!CODE_RE.test(code)) throw new ValidationError('Código de sala inválido');
      const mapId = String(req.params.mapId ?? '');
      const userId = req.userId;
      if (!userId) throw new ValidationError('userId ausente no contexto');

      ActiveMapSchema.parse({ mapId });

      const room = await findRoomByCode(getPool(), code);
      if (!room) throw new ValidationError('Sala não encontrada');

      const map = await activateRoomMap(getPool(), room.id, mapId, userId);
      res.json({ map });
    } catch (err) {
      logger.error({ err }, 'map.activate falhou');
      next(err);
    }
  },
);

mapRouter.delete(
  '/:code/map/active',
  requireAuth,
  async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const code = String(req.params.code ?? '').toUpperCase();
      if (!CODE_RE.test(code)) throw new ValidationError('Código de sala inválido');
      const userId = req.userId;
      if (!userId) throw new ValidationError('userId ausente no contexto');

      const room = await findRoomByCode(getPool(), code);
      if (!room) throw new ValidationError('Sala não encontrada');
      await deactivateActiveRoomMap(getPool(), room.id, userId);
      res.status(204).end();
    } catch (err) {
      logger.error({ err }, 'map.deactivate falhou');
      next(err);
    }
  },
);

function mimeToExt(mime: string): string {
  switch (mime) {
    case 'image/png':
      return '.png';
    case 'image/jpeg':
      return '.jpg';
    case 'image/webp':
      return '.webp';
    default:
      return '';
  }
}

async function assertMember(roomId: string, userId: string): Promise<void> {
  const { assertIsMember } = await import('../services/room.service.js');
  try {
    await assertIsMember(getPool(), roomId, userId);
  } catch (err) {
    if (err instanceof ForbiddenError) throw err;
    throw err;
  }
}
