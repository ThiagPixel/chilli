/**
 * AppShell — layout raiz do app.
 *
 * Mobile-first (390px):
 *   ┌────────────────────┐
 *   │ TopBar (sticky)    │  ← 56px (sem notch)
 *   ├────────────────────┤
 *   │                    │
 *   │     <Outlet />     │  ← flex: 1, scroll
 *   │                    │
 *   ├────────────────────┤
 *   │  BottomNav (opt.)  │  ← 64px (com safe-area)
 *   └────────────────────┘
 *
 * Em >= md (900px), a BottomNav dá lugar a um Drawer persistente e o
 * conteúdo ganha largura máxima. Mantém o app utilizável em desktop
 * sem reescrever componentes.
 */
import { Box, Toolbar } from '@mui/material';
import { useState, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { TopBar } from './TopBar';
import { Drawer } from './Drawer';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { getTitleForPath } from '@/routes/paths';

export interface AppShellProps {
  /** Sobrescreve o outlet quando quiser conteúdo custom (ex.: tela cheia). */
  children?: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isDesktop = useMediaQuery((t) => t.breakpoints.up('md'));
  const location = useLocation();
  const { title, subtitle } = getTitleForPath(location.pathname);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <TopBar
        title={title}
        {...(subtitle !== undefined ? { subtitle } : {})}
        onMenuClick={() => setDrawerOpen(true)}
      />
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        variant={isDesktop ? 'persistent' : 'temporary'}
      />
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          // Em desktop, desloca pelo drawer persistente.
          ...(isDesktop && drawerOpen
            ? { ml: `${280}px`, transition: (t) => t.transitions.create('margin') }
            : {}),
        }}
      >
        {/* Espaçador para o AppBar sticky (Toolbar = 56px + safe-area). */}
        <Toolbar sx={{ minHeight: 'calc(56px + env(safe-area-inset-top)) !important' }} />
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            // Limite de leitura no desktop; mobile usa 100%.
            maxWidth: { xs: '100%', md: 720, lg: 960 },
            width: '100%',
            mx: 'auto',
            p: { xs: 2, sm: 3 },
            animation: 'chilli-fade-in 160ms ease-out',
          }}
          className="page-enter"
        >
          {children ?? <Outlet />}
        </Box>
      </Box>
    </Box>
  );
}
