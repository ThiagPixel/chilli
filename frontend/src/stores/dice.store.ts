/**
 * dice.store — rolagens recentes + paginação.
 *
 * Estado:
 *   - `rolls`    — buffer das rolagens visíveis (mais nova primeiro).
 *   - `hasMore`  — se há rolagens mais antigas disponíveis no server.
 *   - `isLoading` — true enquanto uma chamada de history() está em voo.
 *   - `oldestCursor` — createdAt da rolagem mais antiga no buffer;
 *     usado como `before` na próxima chamada de paginação.
 *
 * Ações:
 *   - `add(roll)`        — adiciona uma rolagem nova (chegou via socket).
 *   - `prependOlder(rolls, hasMore)` — prepende rolagens mais antigas (paginação).
 *   - `hydrate(rolls)`   — substitui o buffer pelo initial state.
 *   - `clear()`          — limpa o buffer (visualização local).
 */
import { create } from 'zustand';
import type { DiceRoll } from '@/types';

const SOFT_LIMIT = 100;

interface DiceState {
  rolls: DiceRoll[];
  hasMore: boolean;
  isLoading: boolean;
  add: (roll: DiceRoll) => void;
  prependOlder: (rolls: DiceRoll[], hasMore: boolean) => void;
  setLoading: (loading: boolean) => void;
  hydrate: (rolls: DiceRoll[]) => void;
  clear: () => void;
}

export const useDiceStore = create<DiceState>((set) => ({
  rolls: [],
  // Começamos com `hasMore = true` — o estado inicial vem com
  // 50 rolagens do `room:state`, então sempre pode haver mais
  // antes da mais antiga. O `loadMore` corrige isso se o server
  // devolver menos que `limit`.
  hasMore: true,
  isLoading: false,
  add: (roll) =>
    set((state) => {
      const next = [roll, ...state.rolls];
      return {
        rolls: next.length > SOFT_LIMIT ? next.slice(0, SOFT_LIMIT) : next,
        // Reset do cursor: nova rolagem vira a mais nova.
      };
    }),
  prependOlder: (older, hasMore) =>
    set((state) => {
      // Filtra duplicatas por id (defesa contra respostas que
      // sobrepõem a última página já carregada).
      const existingIds = new Set(state.rolls.map((r) => r.id));
      const fresh = older.filter((r) => !existingIds.has(r.id));
      if (fresh.length === 0) {
        return { hasMore, isLoading: false };
      }
      // `older` vem DESC do server (mais nova primeiro). Queremos
      // manter a ordem mais-nova-primeiro no buffer, então as
      // rolagens antigas vão pro FINAL.
      const next = [...state.rolls, ...fresh];
      return {
        rolls: next.length > SOFT_LIMIT ? next.slice(0, SOFT_LIMIT) : next,
        hasMore,
        isLoading: false,
      };
    }),
  setLoading: (loading) => set({ isLoading: loading }),
  hydrate: (rolls) => set({ rolls, hasMore: true, isLoading: false }),
  clear: () => set({ rolls: [], hasMore: false, isLoading: false }),
}));
