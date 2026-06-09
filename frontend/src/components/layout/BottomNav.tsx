/**
 * BottomNav — barra de navegação inferior (mobile-first).
 *
 * Em desktop, escondida (a navegação lateral/superior assume).
 */
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CasinoIcon from '@mui/icons-material/Casino';
import MapIcon from '@mui/icons-material/Map';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import { useLocation, useNavigate } from 'react-router-dom';

export type RoomTab = 'chat' | 'dice' | 'map' | 'players' | 'sheet';

export interface BottomNavProps {
  active: RoomTab;
  onChange: (next: RoomTab) => void;
}

const ITEMS: Array<{ value: RoomTab; label: string; icon: React.ReactNode }> = [
  { value: 'chat', label: 'Chat', icon: <ChatBubbleOutlineIcon /> },
  { value: 'dice', label: 'Dados', icon: <CasinoIcon /> },
  { value: 'map', label: 'Mapa', icon: <MapIcon /> },
  { value: 'players', label: 'Jogadores', icon: <PeopleIcon /> },
  { value: 'sheet', label: 'Ficha', icon: <DescriptionIcon /> },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  // Mantém a prop `value` controlada para acessibilidade.
  return (
    <Paper
      sx={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        // iOS home indicator
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: (t) => t.zIndex.appBar - 1,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
      elevation={0}
    >
      <BottomNavigation
        value={active}
        onChange={(_, value: RoomTab) => onChange(value)}
        showLabels
      >
        {ITEMS.map((item) => (
          <BottomNavigationAction key={item.value} value={item.value} label={item.label} icon={item.icon} />
        ))}
      </BottomNavigation>
    </Paper>
  );
}

/**
 * Hook utilitário que sincroniza o tab atual com a query string `?tab=`.
 * Mantém o estado na URL para deep-link e refresh.
 */
export function useRoomTabFromUrl(): [RoomTab, (next: RoomTab) => void] {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const raw = params.get('tab') as RoomTab | null;
  const active: RoomTab =
    raw === 'dice' || raw === 'map' || raw === 'players' || raw === 'sheet' ? raw : 'chat';

  const set = (next: RoomTab) => {
    const p = new URLSearchParams(location.search);
    p.set('tab', next);
    navigate({ search: `?${p.toString()}` }, { replace: true });
  };

  return [active, set];
}
