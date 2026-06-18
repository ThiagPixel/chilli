/**
 * turn.store — turno ativo da sala.
 *
 * Apenas guarda o `currentTurnUserId` (UUID ou null). O nome do jogador
 * com turno é resolvido no consumidor cruzando com `usePlayersStore`.
 *
 * O broadcast `turn:changed` é a única fonte de atualização; o
 * `room:state` inicial popula via `hydrateFromState`.
 */
import { create } from 'zustand';

interface TurnState {
  currentTurnUserId: string | null;
  set: (userId: string | null) => void;
  clear: () => void;
}

export const useTurnStore = create<TurnState>((set) => ({
  currentTurnUserId: null,
  set: (userId) => set({ currentTurnUserId: userId }),
  clear: () => set({ currentTurnUserId: null }),
}));
