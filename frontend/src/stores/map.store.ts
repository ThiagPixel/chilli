/**
 * map.store — estado do mapa ativo, da viewport e da lista de mapas.
 *
 * - `active` (RoomMap) é a fonte de verdade do "qual mapa está sendo visto".
 * - `view` (x/y/zoom) é volátil — perdida ao trocar de mapa. Sincronizada
 *   com o servidor via `map:updated`.
 * - `maps` é a lista completa de mapas da sala (Feature #3). Sincronizada
 *   via `room:state.maps` (no join) e `maps:list` (mutações em tempo real).
 *
 * Ações:
 *   - `setActive(map)` — troca o mapa ativo e reseta a view.
 *   - `setActiveKeepView(map)` — atualiza o mapa (refresh) sem resetar
 *     a view (defesa contra scroll perdida em pull-to-refresh).
 *   - `setView(view)` — atualiza x/y/zoom parcialmente.
 *   - `setMaps(maps)` — substitui a lista (room:join, maps:list).
 *   - `upsertMap(map)` — adiciona ou atualiza um mapa na lista.
 *   - `removeMap(mapId)` — remove da lista; limpa `active` se era ele.
 *   - `reset()` — limpa tudo.
 */
import { create } from 'zustand';
import type { RoomMap } from '@/types';

export interface MapViewState {
  x: number;
  y: number;
  zoom: number;
}

interface MapState {
  active: RoomMap | null;
  view: MapViewState;
  maps: RoomMap[];
  setActive: (map: RoomMap | null) => void;
  setActiveKeepView: (map: RoomMap | null) => void;
  setView: (view: Partial<MapViewState>) => void;
  setMaps: (maps: RoomMap[]) => void;
  upsertMap: (map: RoomMap) => void;
  removeMap: (mapId: string) => void;
  reset: () => void;
}

const DEFAULT_VIEW: MapViewState = { x: 0, y: 0, zoom: 1 };

export const useMapStore = create<MapState>((set) => ({
  active: null,
  view: DEFAULT_VIEW,
  maps: [],
  setActive: (map) => set({ active: map, view: DEFAULT_VIEW }),
  setActiveKeepView: (map) => set({ active: map }),
  setView: (view) => set((s) => ({ view: { ...s.view, ...view } })),
  setMaps: (maps) => set({ maps }),
  upsertMap: (map) =>
    set((s) => {
      const idx = s.maps.findIndex((m) => m.id === map.id);
      if (idx === -1) return { maps: [map, ...s.maps] };
      const next = s.maps.slice();
      next[idx] = map;
      return { maps: next };
    }),
  removeMap: (mapId) =>
    set((s) => {
      const wasActive = s.active?.id === mapId;
      return {
        maps: s.maps.filter((m) => m.id !== mapId),
        ...(wasActive ? { active: null, view: DEFAULT_VIEW } : {}),
      };
    }),
  reset: () => set({ active: null, view: DEFAULT_VIEW, maps: [] }),
}));
