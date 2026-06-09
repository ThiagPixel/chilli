/**
 * players.store — membros da sala atual.
 */
import { create } from 'zustand';
import type { User, RoomMember } from '@/types';

export type RoomMemberView = { user: User; role: RoomMember['role'] };

interface PlayersState {
  members: RoomMemberView[];
  set: (members: RoomMemberView[]) => void;
  add: (user: User, role: RoomMember['role']) => void;
  remove: (userId: string) => void;
  clear: () => void;
}

export const usePlayersStore = create<PlayersState>((set) => ({
  members: [],
  set: (members) => set({ members }),
  add: (user, role) =>
    set((state) => {
      if (state.members.some((m) => m.user.id === user.id)) return state;
      return { members: [...state.members, { user, role }] };
    }),
  remove: (userId) =>
    set((state) => ({ members: state.members.filter((m) => m.user.id !== userId) })),
  clear: () => set({ members: [] }),
}));
