/**
 * Estado em memória do servidor Socket.IO.
 *
 * Persistência de longo prazo é o Postgres. Aqui guardamos só o
 * que é volátil e por sala:
 *   - `viewByRoom`: última posição/zoom do mapa ativo (para novos
 *     membros verem onde a mesa "está" no momento do join).
 *
 * Quando o processo reinicia, essa informação se perde. Aceitável
 * para o MVP — não há requisito de "replay" de viewport.
 */

export interface MapView {
  mapId: string;
  x: number;
  y: number;
  zoom: number;
}

const viewByRoom = new Map<string, MapView>();

export function setRoomView(roomCode: string, view: MapView): void {
  viewByRoom.set(roomCode, view);
}

export function getRoomView(roomCode: string): MapView | undefined {
  return viewByRoom.get(roomCode);
}

export function clearRoomView(roomCode: string): void {
  viewByRoom.delete(roomCode);
}
