/**
 * PlayerList — membros da sala atual.
 *
 * Mostra:
 *   - O próprio usuário no topo (com chip "você").
 *   - Demais membros, mestre primeiro.
 *   - Ação "abrir ficha" em cada linha.
 *
 * Stub: `onOpenSheet` é uma prop que a `RoomPage` usa para
 * navegar até a aba "Ficha" (ou abrir um modal). O estado
 * `members` virá de `usePlayersStore` populado pelo socket
 * na fase 5.
 */
import { useMemo } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { usePlayersStore } from '@/stores/players.store';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { PlayerBadge } from './PlayerBadge';
import { EmptyState } from '@/components/ui';
import PeopleIcon from '@mui/icons-material/People';
import { PATHS } from '@/routes/paths';
import type { User, RoomMember } from '@/types';

export interface PlayerListProps {
  members?: Array<{ user: User; role: RoomMember['role'] }>;
  onOpenSheet?: (userId: string) => void;
}

export function PlayerList({ members: membersProp, onOpenSheet }: PlayerListProps) {
  const storeMembers = usePlayersStore((s) => s.members);
  const { user } = useAuth();
  const toast = useToast();
  const members = membersProp ?? storeMembers;

  // Ordena: mestre primeiro, depois o próprio usuário, depois o resto (alfabético).
  const sorted = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.role !== b.role) return a.role === 'master' ? -1 : 1;
      if (user && a.user.id === user.id) return -1;
      if (user && b.user.id === user.id) return 1;
      return a.user.name.localeCompare(b.user.name, 'pt-BR');
    });
  }, [members, user]);

  const copyCode = () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    const code = location.pathname.replace(PATHS.roomPattern, '').replace('/r/', '');
    void navigator.clipboard.writeText(code);
    toast.success('Código copiado.');
  };

  const fallbackOpen = (id: string) => {
    toast.info(`Ficha de ${id} em breve.`);
  };

  return (
    <Stack sx={{ flex: 1, minHeight: 0 }} spacing={2}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Typography variant="overline" color="text.secondary">
          Jogadores ({members.length})
        </Typography>
        <Button
          size="small"
          variant="text"
          startIcon={<ContentCopyIcon />}
          onClick={copyCode}
          disabled={members.length === 0}
        >
          Copiar código
        </Button>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {sorted.length === 0 ? (
          <EmptyState
            icon={<PeopleIcon fontSize="inherit" />}
            title="Ninguém na mesa ainda"
            description="Os jogadores que entrarem aparecerão aqui em tempo real."
          />
        ) : (
          <Stack spacing={1}>
            {sorted.map((m) => {
              const isMe = Boolean(user && m.user.id === user.id);
              const open = onOpenSheet ?? fallbackOpen;
              const showAction = isMe || onOpenSheet;
              return (
                <PlayerBadge
                  key={m.user.id}
                  user={m.user}
                  role={m.role}
                  right={
                    showAction ? (
                      <Button
                        size="small"
                        variant="text"
                        startIcon={<DescriptionIcon />}
                        onClick={() => open(m.user.id)}
                      >
                        {isMe ? 'Minha ficha' : 'Ficha'}
                      </Button>
                    ) : null
                  }
                />
              );
            })}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
