/**
 * usePersistedMapView — persiste a viewport do mapa ativo em localStorage
 * por (roomCode, mapId). Cada usuário tem a sua; o broadcast `map:state`
 * continua acontecendo em tempo real (sincronia), mas o refresh traz o
 * usuário de volta para onde ele estava.
 *
 * - No mount, lê `chilli.mapView:<roomCode>:<mapId>` e aplica via
 *   `setView` se houver.
 * - Subscreve mudanças em `useMapStore.view` e escreve com debounce 250ms.
 *
 * Reset (botão "Resetar") continua funcionando — só não persiste.
 * Quando trocar de mapa, o `setActive` do store reseta a view e o
 * subscribe grava o default; ao voltar para um mapa anterior, o mount
 * restaura a view salva.
 */
import { useEffect, useRef } from 'react';
import { useMapStore } from '@/stores/map.store';
import { storage } from '@/utils/storage';
import { useDebouncedCallback } from './useDebouncedCallback';

export interface PersistedView {
  x: number;
  y: number;
  zoom: number;
}

function key(roomCode: string, mapId: string): string {
  return `mapView:${roomCode}:${mapId}`;
}

export function usePersistedMapView(roomCode: string, mapId: string | null): void {
  // Guarda o último mapId para evitar escrever a view padrão quando o
  // componente desmonta/troca de mapa (cleanup não é o problema, mas o
  // subscribe pode disparar nesse intervalo).
  const lastMapIdRef = useRef<string | null>(null);

  // 1) Mount: restaura a view salva (se houver) para o mapId atual.
  useEffect(() => {
    if (!mapId) {
      lastMapIdRef.current = null;
      return;
    }
    const saved = storage.get<PersistedView | null>(key(roomCode, mapId), null);
    if (saved) {
      useMapStore.getState().setView({ x: saved.x, y: saved.y, zoom: saved.zoom });
    }
    lastMapIdRef.current = mapId;
  }, [roomCode, mapId]);

  // 2) Subscribe: escreve a view do mapId atual com debounce 250ms.
  const writeBack = useDebouncedCallback((mapIdAtWrite: string, view: PersistedView) => {
    storage.set(key(roomCode, mapIdAtWrite), view);
  }, 250);

  useEffect(() => {
    if (!mapId) return undefined;
    const unsub = useMapStore.subscribe((state) => {
      // Só escreve se o mapId ativo ainda é o que estávamos observando.
      if (lastMapIdRef.current !== mapId) return;
      const v = state.view;
      writeBack(mapId, { x: v.x, y: v.y, zoom: v.zoom });
    });
    return unsub;
  }, [roomCode, mapId, writeBack]);
}
