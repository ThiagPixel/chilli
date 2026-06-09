/**
 * dice.store — rolagens recentes.
 */
import { create } from 'zustand';
import type { DiceRoll } from '@/types';

const SOFT_LIMIT = 100;

interface DiceState {
  rolls: DiceRoll[];
  add: (roll: DiceRoll) => void;
  hydrate: (rolls: DiceRoll[]) => void;
  clear: () => void;
}

export const useDiceStore = create<DiceState>((set) => ({
  rolls: [],
  add: (roll) =>
    set((state) => {
      const next = [roll, ...state.rolls];
      return { rolls: next.length > SOFT_LIMIT ? next.slice(0, SOFT_LIMIT) : next };
    }),
  hydrate: (rolls) => set({ rolls }),
  clear: () => set({ rolls: [] }),
}));
