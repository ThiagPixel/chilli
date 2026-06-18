/**
 * Room — página da mesa.
 *
 * Mobile-first: BottomNav troca entre abas (chat, dados, mapa, jogadores, ficha).
 * Desktop: usa a mesma estrutura, com largura maior; o layout em
 * três colunas (chat | players | history).
 *
 * O histórico de rolagens vive num painel persistente (sidebar
 * desktop) ou bottom-sheet (FAB mobile) — não some mais ao
 * trocar de aba.
 */
import { useNavigate, useParams } from 'react-router-dom';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useAuth } from '@/hooks/useAuth';
import { useRoom } from '@/hooks/useRoom';
import { BottomNav, useRoomTabFromUrl } from '@/components/layout';
import { ChatPanel } from '@/components/chat';
import { DiceRoller, DiceHistoryFab, DiceHistorySidebar } from '@/components/dice';
import { MapView } from '@/components/map';
import { PlayerList } from '@/components/players';
import { SheetPage } from '@/pages/Sheet';
import { PATHS } from '@/routes/paths';
import { Box } from '@mui/material';

function renderTab(
  tab: string,
  code: string,
  isMaster: boolean,
  onOpenSheet?: (userId: string) => void,
) {
  switch (tab) {
    case 'chat':
      return <ChatPanel roomCode={code} />;
    case 'dice':
      return <DiceRoller roomCode={code} />;
    case 'map':
      return <MapView roomCode={code} isMaster={isMaster} />;
    case 'players':
      return <PlayerList {...(onOpenSheet ? { onOpenSheet } : {})} />;
    case 'sheet':
      return <SheetPage roomCode={code} />;
    default:
      return <ChatPanel roomCode={code} />;
  }
}

export function RoomPage() {
  const { code = '' } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const isDesktop = useMediaQuery((t) => t.breakpoints.up('md'));
  const [tab, setTab] = useRoomTabFromUrl();
  const { user } = useAuth();
  const { room } = useRoom();
  const isMaster = Boolean(user && room && user.id === room.masterId);

  const openSheet = () => {
    const p = new URLSearchParams(location.search);
    p.set('tab', 'sheet');
    navigate({ pathname: PATHS.room(code), search: `?${p.toString()}` }, { replace: true });
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        flex: 1,
        minHeight: 0,
        gap: { md: 2 },
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          minWidth: 0,
        }}
      >
        <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {renderTab(tab, code, isMaster, tab === 'players' ? openSheet : undefined)}
        </Box>
        {isDesktop ? null : <BottomNav active={tab} onChange={setTab} />}
      </Box>

      {/* Sidebar desktop: jogadores. */}
      {isDesktop ? (
        <Box
          sx={{
            width: 280,
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            borderLeft: { md: '1px solid' },
            borderColor: { md: 'divider' },
            pl: { md: 2 },
          }}
        >
          <PlayerList />
        </Box>
      ) : null}

      {/* Sidebar desktop: histórico de rolagens (persistente). */}
      <DiceHistorySidebar width={300} />

      {/* FAB mobile: abre o histórico em bottom-sheet. */}
      <DiceHistoryFab />
    </Box>
  );
}
