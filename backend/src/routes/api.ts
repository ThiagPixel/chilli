/**
 * Router principal da API REST.
 *
 * Centraliza versionamento e prefixo. Mantém o app.ts limpo.
 *
 *   /api/auth/*   → authRouter
 *   /api/rooms/*  → roomRouter
 */
import { Router } from 'express';
import { authRouter } from '../controllers/auth.controller.js';
import { roomRouter } from '../controllers/room.controller.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/rooms', roomRouter);
