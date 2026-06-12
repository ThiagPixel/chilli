/**
 * Referência singleton do `io` (Socket.IO server).
 *
 * Necessária para que controllers REST consigam emitir eventos para a
 * sala (ex.: `maps:list` após upload/activate/rename/delete). O `io` é
 * criado em `attachSocketServer` (depois do Express já estar em pé) e
 * guardado aqui para acesso síncrono.
 *
 * Padrão: em testes de unidade/integrados sem socket, `getIO()` retorna
 * `null` e os chamadores tratam o no-op.
 */
import type { ChilliIo } from './index.js';

let ioRef: ChilliIo | null = null;

export function setIO(io: ChilliIo): void {
  ioRef = io;
}

export function getIO(): ChilliIo | null {
  return ioRef;
}
