/**
 * tokens.store — tokens do mapa ativo.
 *
 * Tokens vivem por mapa (e, por denormalização, por sala). O cliente
 * filtra os tokens pelo `active.id` do `useMapStore` na hora de
 * renderizar — aqui mantemos a lista completa da sala para simplificar
 * o manejo dos broadcasts (criado / movido / removido sem precisar
 * conhecer o mapa ativo).
 *
 * Ações:
 *   - `set(tokens)` — substitui tudo (usado no `hydrateFromState`).
 *   - `add(token)` — adiciona (criado em tempo real).
 *   - `update(id, partial)` — atualiza in-place (movido em tempo real).
 *   - `remove(id)` — remove (deletado em tempo real).
 *   - `clear()` — limpa (no leave da sala).
 */
import { create } from 'zustand';
import type { MapToken } from '@/types';

interface TokensState {
  tokens: MapToken[];
  set: (tokens: MapToken[]) => void;
  add: (token: MapToken) => void;
  update: (id: string, partial: Partial<MapToken>) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export const useTokensStore = create<TokensState>((set) => ({
  tokens: [],
  set: (tokens) => set({ tokens }),
  add: (token) => set((s) => (s.tokens.some((t) => t.id === token.id) ? s : { tokens: [...s.tokens, token] })),
  update: (id, partial) =>
    set((s) => ({
      tokens: s.tokens.map((t) => (t.id === id ? { ...t, ...partial } : t)),
    })),
  remove: (id) => set((s) => ({ tokens: s.tokens.filter((t) => t.id !== id) })),
  clear: () => set({ tokens: [] }),
}));
