/**
 * DiceHistoryList — lista de rolagens com filtro, paginação e animação.
 *
 * Componente reutilizável: usado pela aba de dados, pelo painel
 * persistente (DiceHistoryPanel) e pelo drawer mobile. O scroll
 * até o topo dispara `loadMore()` para paginação infinita.
 *
 * Props:
 *   - `currentUserId` — para resolver "minhas rolagens" no filtro.
 *   - `onCountChange` — opcional, chamado quando o tamanho da lista
 *     muda (usado pelo header do Drawer para mostrar "X rolagens").
 *   - `emptyState` — opcional, mensagem custom quando vazio.
 *   - `dense` — true reduz o padding (usado dentro do Drawer mobile).
 */
import { useEffect, useMemo, useRef } from 'react';
import { Box, Stack, Typography, CircularProgress, Chip } from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import { useDice } from '@/hooks/useDice';
import { useAuth } from '@/hooks/useAuth';
import { usePlayersStore } from '@/stores/players.store';
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
}

const SCROLL_TOP_THRESHOLD = 40;

export function DiceHistoryList({
  currentUserId: currentUserIdProp,
  onCountChange,
  emptyState,
  onlyMine = false,
  dense = false,
}: DiceHistoryListProps) {
  const { user } = useAuth();
  const currentUserId = currentUserIdProp ?? user?.id ?? null;
  const { rolls, hasMore, isLoading, loadMore } = useDice();
  const members = usePlayersStore((s) => s.members);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const lastReportedCount = useRef<number | null>(null);

  // Notifica contagem para o pai (header do Drawer).
  // `lastReportedCount` começa em `null` para garantir que a primeira
  // mudança de tamanho dispare o callback, mesmo que rolls já tenha
  // itens no mount.
  useEffect(() => {
    if (lastReportedCount.current === null || rolls.length !== lastReportedCount.current) {
      lastReportedCount.current = rolls.length;
      onCountChange?.(rolls.length);
    }
  }, [rolls.length, onCountChange]);

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

  return (
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
                  // Animação de entrada para rolagens novas (sockets).
                  // Não aplicamos em re-renders de scroll/paginação.
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

      {/* Contador de filtro, no rodapé. */}
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
  );
}
