/**
 * RoomTabsBar — barra de abas horizontal (desktop).
 *
 * Complementa o `BottomNav` (mobile) para que o usuário de PC
 * também consiga alternar entre Chat / Dados / Mapa / Jogadores /
 * Ficha sem editar a URL na mão.
 *
 * Padrão Material: sub-nav sticky logo abaixo do TopBar,
 * ocupando toda a largura (escapa do `max-width` do conteúdo).
 *
 * Renderiza apenas quando:
 *   - O pathname é `/r/:code` (dentro de uma sala)
 *   - O viewport é `md+` (>= 900px)
 *
 * Em mobile, o `BottomNav` continua sendo a fonte de verdade.
 * Compartilhamos o hook `useRoomTabFromUrl` com ele — clicar em
 * uma aba aqui e usar a BottomNav no celular produz o mesmo efeito.
 */
import { Box, Tab, Tabs } from '@mui/material';
import type { ReactElement } from 'react';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import CasinoIcon from '@mui/icons-material/Casino';
import MapIcon from '@mui/icons-material/Map';
import PeopleIcon from '@mui/icons-material/People';
import DescriptionIcon from '@mui/icons-material/Description';
import { useLocation } from 'react-router-dom';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useRoomTabFromUrl, type RoomTab } from './BottomNav';

const TABS: ReadonlyArray<{ value: RoomTab; label: string; icon: ReactElement; aria: string }> = [
  { value: 'chat', label: 'Chat', icon: <ChatBubbleOutlineIcon fontSize="small" />, aria: 'Abrir chat' },
  { value: 'dice', label: 'Dados', icon: <CasinoIcon fontSize="small" />, aria: 'Abrir rolar dados' },
  { value: 'map', label: 'Mapa', icon: <MapIcon fontSize="small" />, aria: 'Abrir mapa' },
  { value: 'players', label: 'Jogadores', icon: <PeopleIcon fontSize="small" />, aria: 'Abrir jogadores' },
  { value: 'sheet', label: 'Ficha', icon: <DescriptionIcon fontSize="small" />, aria: 'Abrir ficha' },
];

/** Altura fixa da barra (combina com a altura default do `Tabs` do MUI). */
const TABS_BAR_HEIGHT = 48;

export function RoomTabsBar() {
  const location = useLocation();
  const isDesktop = useMediaQuery((t) => t.breakpoints.up('md'));
  const [active, setActive] = useRoomTabFromUrl();

  // Só faz sentido dentro de uma sala. Em outras páginas (Home, criar,
  // entrar) o `BottomNav` não aparece, então a barra também não.
  const inRoom = /^\/r\//.test(location.pathname);
  if (!inRoom || !isDesktop) return null;

  return (
    <Box
      component="nav"
      aria-label="Abas da sala"
      data-testid="room-tabs-bar"
      sx={{
        // Sticky abaixo do TopBar (56px + safe-area no iOS).
        position: 'sticky',
        top: 'calc(56px + env(safe-area-inset-top))',
        zIndex: (t) => t.zIndex.appBar - 2,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        // Conta a própria altura para que o conteúdo abaixo não
        // fique coberto quando a página é carregada sem scroll.
        height: TABS_BAR_HEIGHT,
        // Empurra o conteúdo da sala para baixo — evita sobreposição
        // com a primeira renderização.
        flexShrink: 0,
      }}
    >
      <Tabs
        value={active}
        onChange={(_, next: RoomTab) => setActive(next)}
        variant="scrollable"
        scrollButtons="auto"
        // Garante que a barra use a altura exata (sem o padding default do Tabs).
        sx={{
          minHeight: TABS_BAR_HEIGHT,
          '& .MuiTab-root': { minHeight: TABS_BAR_HEIGHT, py: 0 },
        }}
      >
        {TABS.map((t) => (
          <Tab
            key={t.value}
            value={t.value}
            label={t.label}
            icon={t.icon}
            iconPosition="start"
            aria-label={t.aria}
            data-testid={`room-tab-${t.value}`}
          />
        ))}
      </Tabs>
    </Box>
  );
}
