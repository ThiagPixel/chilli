/**
 * usePullToRefresh — hook de gesto para recarregar uma lista ao
 * puxar de cima para baixo no topo do scroll.
 *
 * Funciona em qualquer elemento com `overflow: auto/scroll`. Anexa
 * listeners de `touchstart`/`touchmove`/`touchend` no elemento
 * passado (ou em `window` se nenhum for passado).
 *
 * Retorno:
 *   - `bind`: handlers para passar ao elemento scrollable (onTouchStart, etc.)
 *   - `pullDistance`: pixels puxados desde o topo (0 quando não está puxando)
 *   - `isRefreshing`: true enquanto `onRefresh()` está em execução
 *   - `isPulling`: true enquanto o usuário está arrastando para baixo
 *
 * Thresholds:
 *   - `threshold` (default 80px): distância mínima para disparar refresh
 *   - `maxPull` (default 120px): distância máxima que o indicador visual segue
 *
 * Resistência: o `pullDistance` real segue o dedo com `min(real, maxPull)`.
 * Acima do `threshold`, dispara `onRefresh()`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface UsePullToRefreshOptions {
  /** Callback a disparar quando o usuário puxa além do threshold. */
  onRefresh: () => Promise<void> | void;
  /** Distância mínima em px para disparar. Default 80. */
  threshold?: number;
  /** Distância máxima que o indicador visual segue. Default 120. */
  maxPull?: number;
  /** Elemento scrollable alvo. Se omitido, usa window. */
  targetRef?: React.RefObject<HTMLElement | null>;
}

export interface UsePullToRefreshResult {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  pullDistance: number;
  isPulling: boolean;
  isRefreshing: boolean;
}

const SCROLL_TOP_THRESHOLD = 4; // tolerância para o "topo"

function isAtTop(el: HTMLElement | null): boolean {
  if (!el) return true; // sem scroll (ex.: window) = topo
  return el.scrollTop <= SCROLL_TOP_THRESHOLD;
}

export function usePullToRefresh(
  options: UsePullToRefreshOptions,
): UsePullToRefreshResult {
  const { onRefresh, threshold = 80, maxPull = 120, targetRef } = options;
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const startYRef = useRef<number | null>(null);
  const triggeredRef = useRef<boolean>(false);
  const onRefreshRef = useRef(onRefresh);
  // Mantém a referência mais recente sem re-registrar listeners.
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const target = targetRef?.current ?? null;
    if (!isAtTop(target)) return;
    const t = e.touches[0];
    if (!t) return;
    startYRef.current = t.clientY;
    triggeredRef.current = false;
    setIsPulling(true);
  }, [targetRef]);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (startYRef.current === null) return;
      const t = e.touches[0];
      if (!t) return;
      const target = targetRef?.current ?? null;
      // Se o usuário começou a rolar para CIMA durante o pull,
      // cancela o gesto.
      if (!isAtTop(target)) {
        startYRef.current = null;
        setPullDistance(0);
        return;
      }
      const dy = t.clientY - startYRef.current;
      if (dy <= 0) {
        // Subindo ou parado — sem pull.
        setPullDistance(0);
        return;
      }
      // Aplica resistência: o "indicador" segue mais devagar que o dedo.
      const resisted = Math.min(maxPull, dy * 0.55);
      setPullDistance(resisted);
      // Dispara o refresh se passar do threshold (uma vez por gesto).
      if (resisted >= threshold && !triggeredRef.current && !isRefreshing) {
        triggeredRef.current = true;
        setIsRefreshing(true);
        // Não prevenimos o default aqui — o browser pode rolar o
        // pull-to-refresh nativo do SO por baixo, mas como estamos
        // no topo com overscroll-behavior: contain, o efeito é mínimo.
        void Promise.resolve(onRefreshRef.current()).finally(() => {
          setIsRefreshing(false);
          setPullDistance(0);
          setIsPulling(false);
          startYRef.current = null;
        });
      }
    },
    [maxPull, threshold, isRefreshing, targetRef],
  );

  const onTouchEnd = useCallback(() => {
    startYRef.current = null;
    // Se largou antes do threshold, volta.
    if (!triggeredRef.current) {
      setPullDistance(0);
      setIsPulling(false);
    }
  }, []);

  // Reset no unmount.
  useEffect(() => {
    return () => {
      startYRef.current = null;
      triggeredRef.current = false;
    };
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    pullDistance,
    isPulling,
    isRefreshing,
  };
}
