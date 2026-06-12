/**
 * PlayerList — membros da sala atual.
 *
 * Mostra:
 *   - O próprio usuário no topo (com chip "você").
 *   - Demais membros, mestre primeiro.
 *   - Ação "Minha ficha" para si; "Ficha" para outros (v2, fora do MVP).
 *
 * `members` é populado via Socket.IO (`room:state.members` +
 * eventos `room:user_joined` / `room:user_left`) e mantido em
 * `usePlayersStore`. O pull-to-refresh re-busca via REST como
 * defesa contra race conditions.
 */
import { useCallback, useMemo } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { usePlayersStore } from '@/stores/players.store';
import { useAuth } from '@/hooks/useAuth';
import { useRoom } from '@/hooks/useRoom';
import { useToast } from '@/hooks/useToast';
import { PlayerBadge } from './PlayerBadge';
import { EmptyState, RefreshableScroller } from '@/components/ui';
import { roomService } from '@/services';
import PeopleIcon from '@mui/icons-material/People';
import { PATHS } from '@/routes/paths';
import type { User, RoomMember } from '@/types';

export interface PlayerListProps {
  members?: Array<{ user: User; role: RoomMember['role'] }>;
  onOpenSheet?: (userId: string) => void;
}

export function PlayerList({ members: membersProp, onOpenSheet }: PlayerListProps) {
  const storeMembers = usePlayersStore((s) => s.members);
  const setStoreMembers = usePlayersStore((s) => s.set);
  const { user } = useAuth();
  const { room } = useRoom();
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

  const copyCode = (): void => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    const code = location.pathname.replace(PATHS.roomPattern, '').replace('/r/', '');
    void navigator.clipboard.writeText(code);
    toast.success('Código copiado.');
  };

  const handleOpen = (targetId: string, isMe: boolean): void => {
    if (isMe && onOpenSheet) {
      onOpenSheet(targetId);
      return;
    }
    // Ver a ficha de OUTROS jogadores não está no MVP — é uma feature
    // v2 (ficha pública vs privada). Sinaliza com info até lá.
    if (!isMe) {
      toast.info('Ver fichas de outros jogadores chega em uma próxima fase.');
    }
  };

  const refresh = useCallback(async (): Promise<void> => {
    if (!room?.code) return;
    try {
      // listMembers retorna RoomMember[] (sem o user embutido).
      // Resolvemos os users em paralelo via userService — mas como
      // essa info já chega via socket, aqui só pedimos uma página
      // e usamos os user ids que já conhecemos (defesa contra drift).
      // Simplificação: para o MVP, listMembers retorna RoomMember[]
      // sem user; ignoramos silenciosamente membros sem user (que
      // serão repopulados via socket na próxima reconnect).
      const fresh = await roomService.listMembers(room.code);
      // Mapear: o store quer { user, role } mas listMembers só dá
      // { userId, role }. Para o refresh, fundimos com o que já temos.
      const known = new Map(storeMembers.map((m) => [m.user.id, m.user]));
      const merged = fresh
        .map((m) => {
          const user = known.get(m.userId);
          if (!user) return null;
          return { user, role: m.role };
        })
        .filter((x): x is { user: User; role: RoomMember['role'] } => x !== null);
      setStoreMembers(merged);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao atualizar membros';
      toast.error(message);
    }
  }, [room?.code, setStoreMembers, toast, storeMembers]);

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

      <RefreshableScroller
        onRefresh={refresh}
        refreshLabel="Atualizar membros"
      >
        {sorted.length === 0 ? (
          <EmptyState
            icon={<PeopleIcon fontSize="inherit" />}
            title="Ninguém na mesa ainda"
            description="Os jogadores que entrarem aparecerão aqui em tempo real."
          />
        ) : (
          <Stack spacing={1} sx={{ py: 1 }}>
            {sorted.map((m) => {
              const isMe = Boolean(user && m.user.id === user.id);
              return (
                <PlayerBadge
                  key={m.user.id}
                  user={m.user}
                  role={m.role}
                  right={
                    <Button
                      size="small"
                      variant="text"
                      startIcon={<DescriptionIcon />}
                      onClick={() => handleOpen(m.user.id, isMe)}
                    >
                      {isMe ? 'Minha ficha' : 'Ficha'}
                    </Button>
                  }
                />
              );
            })}
          </Stack>
        )}
      </RefreshableScroller>
    </Stack>
  );
}
