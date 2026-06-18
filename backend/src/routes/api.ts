/**
 * Router principal da API REST.
 *
 * Centraliza versionamento e prefixo. Mantém o app.ts limpo.
 *
 *   /api/auth/*            → authRouter
 *   /api/rooms/*           → roomRouter (+ messageRouter + diceHistoryRouter + sheetRouter + mapRouter)
 *   /api/characters/:id    → sheetRouter (PATCH)
 */
import { Router } from 'express';
import { authRouter } from '../controllers/auth.controller.js';
import { roomRouter } from '../controllers/room.controller.js';
import { messageRouter } from '../controllers/message.controller.js';
import { diceHistoryRouter } from '../controllers/dice.controller.js';
import { sheetRouter } from '../controllers/sheet.controller.js';
import { mapRouter } from '../controllers/map.controller.js';
import { mapTokenRouter } from '../controllers/mapToken.controller.js';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/rooms', roomRouter);
apiRouter.use('/rooms', messageRouter);
apiRouter.use('/rooms', diceHistoryRouter);
apiRouter.use('/rooms', sheetRouter);
apiRouter.use('/rooms', mapRouter);
apiRouter.use('/rooms', mapTokenRouter);
apiRouter.use('/', sheetRouter); // PATCH /api/characters/:id
