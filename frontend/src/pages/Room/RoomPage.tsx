/**
 * Room — página da mesa.
 *
 * Mobile-first: BottomNav troca entre abas (chat, dados, mapa, jogadores, ficha).
 * Desktop: usa a mesma estrutura, com largura maior; o layout em duas
 * colunas (chat | sidebar) entra na fase 5.
 *
 * Stub: alterna pelo `?tab=` da URL. A lógica de join via Socket.IO
 * e a sincronização do RoomState entram na fase 5.
 */
import { useNavigate, useParams } from 'react-router-dom';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { BottomNav, useRoomTabFromUrl } from '@/components/layout';
import { ChatPanel } from '@/components/chat';
import { DiceRoller } from '@/components/dice';
import { MapView } from '@/components/map';
import { PlayerList } from '@/components/players';
import { SheetPage } from '@/pages/Sheet';
import { PATHS } from '@/routes/paths';
import { Box } from '@mui/material';

function renderTab(
  tab: string,
  code: string,
  onOpenSheet?: (userId: string) => void,
) {
  switch (tab) {
    case 'chat':
      return <ChatPanel roomCode={code} />;
    case 'dice':
      return <DiceRoller roomCode={code} />;
    case 'map':
      return <MapView roomCode={code} isMaster={false} />;
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
        }}
      >
        <Box sx={{ flex: 1, display: 'flex', minHeight: 0 }}>
          {renderTab(tab, code, tab === 'players' ? openSheet : undefined)}
        </Box>
        {isDesktop ? null : <BottomNav active={tab} onChange={setTab} />}
      </Box>

      {/* Stub: em desktop, sidebar com lista compacta de jogadores.
          Implementação completa entra na fase 5. */}
      {isDesktop ? (
        <Box
          sx={{
            width: 320,
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
    </Box>
  );
}
