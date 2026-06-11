/**
 * DiceHistoryList — lista de rolagens com filtro, paginação e animação.
 *
 * Componente reutilizável: usado pela aba de dados, pelo painel
 * persistente (DiceHistoryPanel) e pelo drawer mobile. O scroll
 * até o topo dispara `loadMore()` para paginação infinita.
 *
 * Pull-to-refresh integrado (via `usePullToRefresh`) — chama
 * `useDice().refresh()` que re-hidrata a store do server.
 *
 * Props:
 *   - `currentUserId` — para resolver "minhas rolagens" no filtro.
 *   - `onCountChange` — opcional, chamado quando o tamanho da lista
 *     muda (usado pelo header do Drawer para mostrar "X rolagens").
 *   - `emptyState` — opcional, mensagem custom quando vazio.
 *   - `dense` — true reduz o padding (usado dentro do Drawer mobile).
 *   - `showRefreshButton` — false esconde o botão desktop (default true).
 */
import { useEffect, useMemo, useRef } from 'react';
import { Box, Stack, Typography, CircularProgress, Chip, IconButton, Tooltip } from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useDice } from '@/hooks/useDice';
import { useAuth } from '@/hooks/useAuth';
import { usePlayersStore } from '@/stores/players.store';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { RollResult } from './RollResult';
import { EmptyState } from '@/components/ui';
import type { DiceRoll, User } from '@/types';

export interface DiceHistoryListProps {
  currentUserId?: string | null;
  onCountChange?: (count: number) => void;
  emptyState?: { title: string; description?: string };
  /** Filtro "só minhas" controlado externamente (opcional). */
  onlyMine?: boolean;
  dense?: boolean;
  showRefreshButton?: boolean;
}

const SCROLL_TOP_THRESHOLD = 40;

export function DiceHistoryList({
  currentUserId: currentUserIdProp,
  onCountChange,
  emptyState,
  onlyMine = false,
  dense = false,
  showRefreshButton = true,
}: DiceHistoryListProps) {
  const { user } = useAuth();
  const currentUserId = currentUserIdProp ?? user?.id ?? null;
  const { rolls, hasMore, isLoading, loadMore, refresh } = useDice();
  const members = usePlayersStore((s) => s.members);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const lastReportedCount = useRef<number | null>(null);

  // Pull-to-refresh.
  const {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    pullDistance,
    isRefreshing,
  } = usePullToRefresh({ onRefresh: refresh, targetRef: scrollerRef });

  // Notifica contagem para o pai (header do Drawer).
  useEffect(() => {
    if (lastReportedCount.current === null || rolls.length !== lastReportedCount.current) {
      lastReportedCount.current = rolls.length;
      onCountChange?.(rolls.length);
    }
  }, [rolls.length, onCountChange]);

  // Anexa os handlers de touch ao scroller via DOM direto.
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
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  // Mapa userId → User para resolver nome/avatar.
  const userMap = useMemo<Map<string, User>>(() => {
    const m = new Map<string, User>();
    for (const member of members) m.set(member.user.id, member.user);
    return m;
  }, [members]);

  // Aplica o filtro "minhas" (cliente-side — lista é pequena).
  const visible = useMemo<DiceRoll[]>(() => {
    if (!onlyMine || !currentUserId) return rolls;
    return rolls.filter((r) => r.userId === currentUserId);
  }, [rolls, onlyMine, currentUserId]);

  // Detecta scroll no topo → loadMore.
  const handleScroll = (): void => {
    const el = scrollerRef.current;
    if (!el) return;
    if (el.scrollTop < SCROLL_TOP_THRESHOLD && hasMore && !isLoading) {
      void loadMore();
    }
  };

  const indicatorVisible = pullDistance > 4 || isRefreshing;
  const indicatorY = isRefreshing ? 8 : Math.max(0, pullDistance - 32);
  const indicatorOpacity = isRefreshing ? 1 : Math.min(1, pullDistance / 40);
  const indicatorValue = isRefreshing ? 100 : Math.min(100, (pullDistance / 40) * 100);

  return (
    <Box sx={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex' }}>
      <Box
        ref={scrollerRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          // Espaço para o spinner de "carregando mais".
          pt: 1,
          pb: 1,
          px: 1,
          overscrollBehaviorY: 'contain',
        }}
        data-testid="dice-history-list"
      >
        {/* Indicador de paginação no topo. */}
        {(hasMore || isLoading) && visible.length > 0 ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              py: 1,
              gap: 1,
              minHeight: 32,
            }}
          >
            {isLoading ? (
              <>
                <CircularProgress size={14} />
                <Typography variant="caption" color="text.secondary">
                  Carregando rolagens anteriores…
                </Typography>
              </>
            ) : hasMore ? (
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ cursor: 'default' }}
              >
                Role para cima para carregar mais
              </Typography>
            ) : null}
          </Box>
        ) : null}

        {visible.length === 0 ? (
          <EmptyState
            icon={<CasinoIcon fontSize="inherit" />}
            title={emptyState?.title ?? 'Nenhuma rolagem ainda'}
            description={
              emptyState?.description ??
              (onlyMine
                ? 'Você ainda não rolou dados nesta mesa.'
                : 'As rolagens da mesa aparecerão aqui em tempo real.')
            }
          />
        ) : (
          <Stack spacing={dense ? 0.75 : 1}>
            {visible.map((r) => {
              const author = userMap.get(r.userId);
              return (
                <Box
                  key={r.id}
                  sx={{
                    animation: 'diceRollIn 320ms ease-out',
                    '@keyframes diceRollIn': {
                      from: { opacity: 0, transform: 'translateY(-6px) scale(0.98)' },
                      to: { opacity: 1, transform: 'translateY(0) scale(1)' },
                    },
                  }}
                >
                  <RollResult roll={r} {...(author ? { author } : {})} />
                </Box>
              );
            })}
          </Stack>
        )}

        {onlyMine && visible.length > 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Chip
              size="small"
              label={`${visible.length} ${visible.length === 1 ? 'rolagem' : 'rolagens'} sua(s)`}
              variant="outlined"
            />
          </Box>
        ) : null}
      </Box>

      {/* Indicador de pull-to-refresh (overlay). */}
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
        >
          <Box
            sx={{
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'background.paper',
              borderRadius: '50%',
              boxShadow: 1,
            }}
          >
            <CircularProgress
              size={24}
              thickness={4}
              variant={isRefreshing ? 'indeterminate' : 'determinate'}
              value={indicatorValue}
            />
          </Box>
        </Box>
      ) : null}

      {/* Botão desktop equivalente. */}
      {showRefreshButton ? (
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            zIndex: 1,
          }}
        >
          <Tooltip title="Atualizar rolagens">
            <span>
              <IconButton
                size="small"
                onClick={() => void refresh()}
                disabled={isRefreshing}
                aria-label="Atualizar rolagens"
                sx={{ display: { xs: 'none', md: 'inline-flex' } }}
              >
                {isRefreshing ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      ) : null}
    </Box>
  );
}
