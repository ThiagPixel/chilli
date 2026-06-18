/**
 * Testes do `RoomTabsBar` — sub-nav horizontal para desktop.
 *
 * Cobre:
 *   - Renderiza as 5 abas com labels corretos.
 *   - Esconde fora de `/r/*` (Home, criar, entrar).
 *   - Esconde em mobile (BottomNav assume).
 *   - Marcar a aba ativa reflete `?tab=` da URL.
 *   - Clicar numa aba atualiza `?tab=` na URL.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { MemoryRouter, useLocation, Route, Routes } from 'react-router-dom';
import { theme } from '@/styles/theme';
import { RoomTabsBar } from '@/components/layout';
import type { ReactNode } from 'react';

// Mock do hook de media query para forçar desktop/mobile nos testes.
const { mockUseMediaQuery } = vi.hoisted(() => ({ mockUseMediaQuery: vi.fn() }));
vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: (q: (t: typeof theme) => string) => mockUseMediaQuery(q),
}));

function wrap(node: ReactNode, initialEntries: string[] = ['/r/ABC123']) {
  return render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MemoryRouter initialEntries={initialEntries}>{node}</MemoryRouter>
    </ThemeProvider>,
  );
}

/** Probe que renderiza o `search` atual do `MemoryRouter`. */
function SearchProbe(): ReactNode {
  const { search } = useLocation();
  return <span data-testid="search">{search}</span>;
}

describe('RoomTabsBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: desktop.
    mockUseMediaQuery.mockReturnValue(true);
  });

  it('renderiza as 5 abas com labels corretos quando em /r/* e desktop', () => {
    wrap(<RoomTabsBar />, ['/r/ABC123']);
    expect(screen.getByTestId('room-tabs-bar')).toBeInTheDocument();
    expect(screen.getByTestId('room-tab-chat')).toHaveTextContent('Chat');
    expect(screen.getByTestId('room-tab-dice')).toHaveTextContent('Dados');
    expect(screen.getByTestId('room-tab-map')).toHaveTextContent('Mapa');
    expect(screen.getByTestId('room-tab-players')).toHaveTextContent('Jogadores');
    expect(screen.getByTestId('room-tab-sheet')).toHaveTextContent('Ficha');
  });

  it('não renderiza fora de /r/* (Home)', () => {
    wrap(<RoomTabsBar />, ['/']);
    expect(screen.queryByTestId('room-tabs-bar')).not.toBeInTheDocument();
  });

  it('não renderiza fora de /r/* (criar mesa)', () => {
    wrap(<RoomTabsBar />, ['/criar']);
    expect(screen.queryByTestId('room-tabs-bar')).not.toBeInTheDocument();
  });

  it('não renderiza em mobile mesmo dentro de /r/*', () => {
    mockUseMediaQuery.mockReturnValue(false); // mobile
    wrap(<RoomTabsBar />, ['/r/ABC123']);
    expect(screen.queryByTestId('room-tabs-bar')).not.toBeInTheDocument();
  });

  it('marca a aba "Dados" como ativa quando ?tab=dice está na URL', () => {
    wrap(<RoomTabsBar />, ['/r/ABC123?tab=dice']);
    const diceTab = screen.getByTestId('room-tab-dice');
    // O MUI Tabs aplica `aria-selected="true"` na aba ativa.
    expect(diceTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('room-tab-chat')).toHaveAttribute('aria-selected', 'false');
  });

  it('clicar em "Mapa" atualiza ?tab=map na URL', async () => {
    const user = userEvent.setup();
    wrap(
      <>
        <RoomTabsBar />
        <Routes>
          <Route path="/r/:code" element={<SearchProbe />} />
        </Routes>
      </>,
      ['/r/ABC123'],
    );
    expect(screen.getByTestId('search')).toHaveTextContent('');
    await user.click(screen.getByTestId('room-tab-map'));
    // O hook `useRoomTabFromUrl` faz `navigate({ search: '?tab=map' }, { replace: true })`.
    expect(screen.getByTestId('search')).toHaveTextContent('?tab=map');
    // E a aba correspondente fica ativa.
    expect(screen.getByTestId('room-tab-map')).toHaveAttribute('aria-selected', 'true');
  });
});
