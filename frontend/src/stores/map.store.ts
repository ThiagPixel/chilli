/**
 * map.store — estado do mapa ativo e da viewport.
 *
 * O objeto `active` (RoomMap) é a fonte de verdade do "qual mapa
 * está sendo visto". A `view` (x/y/zoom) é volátil — perdida ao
 * trocar de mapa. Sincronizada com o servidor via `map:updated`.
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
  setActive: (map: RoomMap | null) => void;
  setView: (view: Partial<MapViewState>) => void;
  reset: () => void;
}

const DEFAULT_VIEW: MapViewState = { x: 0, y: 0, zoom: 1 };

export const useMapStore = create<MapState>((set) => ({
  active: null,
  view: DEFAULT_VIEW,
  setActive: (map) => set({ active: map, view: DEFAULT_VIEW }),
  setView: (view) => set((s) => ({ view: { ...s.view, ...view } })),
  reset: () => set({ active: null, view: DEFAULT_VIEW }),
}));
