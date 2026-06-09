/**
 * map.store — estado do mapa ativo (id, posição, zoom).
 */
import { create } from 'zustand';

export interface MapViewState {
  x: number;
  y: number;
  zoom: number;
}

interface MapState {
  activeMapId: string | null;
  view: MapViewState;
  setActive: (id: string | null) => void;
  setView: (view: Partial<MapViewState>) => void;
  reset: () => void;
}

const DEFAULT_VIEW: MapViewState = { x: 0, y: 0, zoom: 1 };

export const useMapStore = create<MapState>((set) => ({
  activeMapId: null,
  view: DEFAULT_VIEW,
  setActive: (id) => set({ activeMapId: id, view: DEFAULT_VIEW }),
  setView: (view) => set((s) => ({ view: { ...s.view, ...view } })),
  reset: () => set({ activeMapId: null, view: DEFAULT_VIEW }),
}));
