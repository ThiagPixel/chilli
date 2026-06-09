/**
 * useMapZoomPan — ponte entre o canvas e a store global.
 *
 * Mantém x/y/zoom no `useMapStore` (Zustand) para que a UI
 * (slider de zoom, botões, gestos) possa ler e escrever no
 * mesmo estado.
 *
 * Limites: zoom 0.5× a 4×, com 1× sendo o padrão.
 */
import { useCallback } from 'react';
import { useMapStore } from '@/stores/map.store';

export interface UseMapZoomPanResult {
  zoom: number;
  x: number;
  y: number;
  setZoom: (z: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setPan: (x: number, y: number) => void;
  reset: () => void;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.2;

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export function useMapZoomPan(): UseMapZoomPanResult {
  const view = useMapStore((s) => s.view);
  const setView = useMapStore((s) => s.setView);
  const reset = useMapStore((s) => s.reset);

  const setZoom = useCallback(
    (zoom: number) => setView({ zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM) }),
    [setView],
  );

  return {
    zoom: view.zoom,
    x: view.x,
    y: view.y,
    setZoom,
    zoomIn: () => setZoom(view.zoom + ZOOM_STEP),
    zoomOut: () => setZoom(view.zoom - ZOOM_STEP),
    setPan: (x, y) => setView({ x, y }),
    reset,
  };
}

export { MIN_ZOOM, MAX_ZOOM };
