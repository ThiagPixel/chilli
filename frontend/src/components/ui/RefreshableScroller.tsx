/**
 * RefreshableScroller — wrapper que adiciona pull-to-refresh (mobile)
 * + botão de atualizar (desktop) a uma área scrollable.
 *
 * Dois modos:
 *   1. `<RefreshableScroller onRefresh={fn}>...children` —
 *      o wrapper cria seu próprio Box scrollable e injeta
 *      children dentro dele. Mais simples, mas exige que os
 *      children sejam "presentational" (não tenham seu próprio
 *      scroller com `flex: 1, minHeight: 0`).
 *
 *   2. `<RefreshableScroller onRefresh={fn} scrollerRef={r}>...
 *      </RefreshableScroller>` — modo "pass-through": o wrapper
 *      NÃO cria scroller; o pai passa o ref do scroller que ele
 *      já tem. Útil quando o conteúdo tem sua própria lógica
 *      de scroll (ex.: MessageList com auto-scroll).
 *
 * Em ambos os modos, o wrapper:
 *   - Anexa os handlers de touch no scroller (touchstart/move/end).
 *   - Mostra o indicador circular (CircularProgress) durante pull/refresh.
 *   - Renderiza o botão "Atualizar" no canto superior direito
 *     (xs:hidden — só aparece em md+).
 */
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { Box, CircularProgress, IconButton, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

export interface RefreshableScrollerProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  /** Ref externo para o scroller (modo pass-through). */
  scrollerRef?: RefObject<HTMLElement | null>;
  contentSx?: Record<string, unknown>;
  /** Threshold em px. Default 80. */
  threshold?: number;
  /** Tooltip do botão desktop. */
  refreshLabel?: string;
}

export function RefreshableScroller({
  onRefresh,
  children,
  scrollerRef: externalScrollerRef,
  contentSx,
  threshold = 80,
  refreshLabel = 'Atualizar',
}: RefreshableScrollerProps) {
  const internalScrollerRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = externalScrollerRef ?? internalScrollerRef;

  const {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    pullDistance,
    isRefreshing,
  } = usePullToRefresh({ onRefresh, threshold, targetRef: scrollerRef });

  const indicatorVisible = pullDistance > 4 || isRefreshing;
  const indicatorY = isRefreshing ? 8 : Math.max(0, pullDistance - 32);
  const indicatorOpacity = isRefreshing ? 1 : Math.min(1, pullDistance / threshold);
  const indicatorValue = isRefreshing ? 100 : Math.min(100, (pullDistance / threshold) * 100);

  // No modo "self-contained" (sem scrollerRef externo), o wrapper
  // cria o Box scrollable e injeta children.
  const inner = externalScrollerRef ? (
    children
  ) : (
    <Box
      ref={internalScrollerRef}
      sx={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        overscrollBehaviorY: 'contain',
        WebkitOverflowScrolling: 'touch',
        ...contentSx,
      }}
    >
      {children}
    </Box>
  );

  return (
    <Box sx={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
      {inner}

      <TouchAttachers
        scrollerRef={scrollerRef as RefObject<HTMLElement | null>}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />

      {indicatorVisible ? (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            transform: `translateY(${indicatorY}px)`,
            opacity: indicatorOpacity,
            transition: isRefreshing ? 'transform 200ms ease-out' : 'none',
          }}
          data-testid="pull-to-refresh-indicator"
          data-state={isRefreshing ? 'refreshing' : 'pulling'}
          data-pct={indicatorValue}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'background.paper',
              borderRadius: '50%',
              boxShadow: 2,
            }}
          >
            <CircularProgress
              size={28}
              thickness={4}
              variant={isRefreshing ? 'indeterminate' : 'determinate'}
              value={indicatorValue}
            />
          </Box>
        </Box>
      ) : null}

      <Box
        sx={{
          position: 'absolute',
          top: 4,
          right: 4,
          zIndex: 1,
        }}
      >
        <Tooltip title={refreshLabel}>
          <span>
            <IconButton
              size="small"
              onClick={() => void onRefresh()}
              disabled={isRefreshing}
              aria-label={refreshLabel}
              sx={{ display: { xs: 'none', md: 'inline-flex' } }}
            >
              {isRefreshing ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}

function TouchAttachers({
  scrollerRef,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
}: {
  scrollerRef: RefObject<HTMLElement | null>;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
}) {
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    el.addEventListener('touchstart', onTouchStart as unknown as EventListener, { passive: true });
    el.addEventListener('touchmove', onTouchMove as unknown as EventListener, { passive: true });
    el.addEventListener('touchend', onTouchEnd as unknown as EventListener, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart as unknown as EventListener);
      el.removeEventListener('touchmove', onTouchMove as unknown as EventListener);
      el.removeEventListener('touchend', onTouchEnd as unknown as EventListener);
    };
  }, [scrollerRef, onTouchStart, onTouchMove, onTouchEnd]);
  return null;
}
