/**
 * Testes do MapView — verifica que a prop `isMaster` é a fonte única
 * de verdade para os controles exclusivos de mestre (uploader, botão
 * "Encerrar turno", botão "Adicionar token").
 *
 * Cobre o bug onde `MapView` recebia `isMaster` por prop e também
 * calculava `viewerIsMaster` a partir de `user/room` — duas fontes
 * que podiam divergir e renderizar controles inconsistentes.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, render } from '@testing-library/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from '@/styles/theme';
import type { ReactNode } from 'react';

// Stub dos componentes filhos: nada de canvas real, sem uploader,
// sem lista — só o esqueleto do MapView importa para o teste.
vi.mock('@/components/map/MapUploader', () => ({
  MapUploader: () => <div data-testid="map-uploader" />,
}));
vi.mock('@/components/map/MapListPanel', () => ({
  MapListPanel: () => <div data-testid="map-list-panel" />,
}));
vi.mock('@/components/map/MapCanvas', () => ({
  MapCanvas: () => <div data-testid="map-canvas" />,
}));
vi.mock('@/components/ui', async () => {
  const actual = await vi.importActual<typeof import('@/components/ui')>('@/components/ui');
  return {
    ...actual,
    // Pass-through simples para não depender do scroller no teste.
    RefreshableScroller: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  };
});

// Hooks e stores.
const { mockUseAuth, mockUseSocket, mockMapService, mockMapTokenService } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseSocket: vi.fn(),
  mockMapService: { list: vi.fn(), upload: vi.fn() },
  mockMapTokenService: { create: vi.fn() },
}));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockUseAuth() }));
vi.mock('@/contexts/SocketContext', () => ({
  useSocketContext: () => mockUseSocket(),
}));
vi.mock('@/services', () => ({
  mapService: mockMapService,
  mapTokenService: mockMapTokenService,
}));

import { MapView } from '@/components/map/MapView';
import { useMapStore } from '@/stores/map.store';
import { usePlayersStore } from '@/stores/players.store';
import { useTurnStore } from '@/stores/turn.store';

const fakeMaster = {
  id: 'master-1',
  name: 'Mestre',
  email: 'm@example.com',
  avatarUrl: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};
const fakePlayer = {
  id: 'player-1',
  name: 'P1',
  email: 'p@example.com',
  avatarUrl: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

function wrap(node: ReactNode) {
  return render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {node}
    </ThemeProvider>,
  );
}

function setMasterViewer(): void {
  mockUseAuth.mockReturnValue({
    user: fakeMaster,
    isLoading: false,
    isLoading_legacy: false,
    error: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    deviceId: 'dev-1',
  });
}
function setPlayerViewer(): void {
  mockUseAuth.mockReturnValue({
    user: fakePlayer,
    isLoading: false,
    isLoading_legacy: false,
    error: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    deviceId: 'dev-1',
  });
}
function setSocketConnected(): void {
  mockUseSocket.mockReturnValue({ socket: { emit: vi.fn() }, isConnected: true });
}

beforeEach(() => {
  vi.clearAllMocks();
  setSocketConnected();
  useMapStore.setState({
    active: null,
    maps: [],
    view: { x: 0, y: 0, zoom: 1 },
  });
  usePlayersStore.setState({ members: [] });
  useTurnStore.setState({ currentTurnUserId: null });
});

describe('MapView — prop isMaster como fonte única de controles', () => {
  it('isMaster=true: renderiza uploader de mapa', () => {
    setMasterViewer();
    wrap(<MapView roomCode="ABC123" isMaster={true} />);
    expect(screen.getByTestId('map-uploader')).toBeInTheDocument();
  });

  it('isMaster=false: NÃO renderiza uploader de mapa', () => {
    setPlayerViewer();
    wrap(<MapView roomCode="ABC123" isMaster={false} />);
    expect(screen.queryByTestId('map-uploader')).not.toBeInTheDocument();
  });

  it('isMaster=true com turno ativo: mostra botão "Encerrar turno"', () => {
    setMasterViewer();
    useTurnStore.setState({ currentTurnUserId: fakePlayer.id });
    usePlayersStore.setState({
      members: [{ user: fakePlayer, role: 'player' }],
    });
    wrap(<MapView roomCode="ABC123" isMaster={true} />);
    expect(screen.getByRole('button', { name: /encerrar turno/i })).toBeInTheDocument();
  });

  it('isMaster=false com turno ativo: NÃO mostra botão "Encerrar turno"', () => {
    setPlayerViewer();
    useTurnStore.setState({ currentTurnUserId: fakePlayer.id });
    usePlayersStore.setState({
      members: [{ user: fakePlayer, role: 'player' }],
    });
    wrap(<MapView roomCode="ABC123" isMaster={false} />);
    expect(screen.queryByRole('button', { name: /encerrar turno/i })).not.toBeInTheDocument();
  });

  it('isMaster=true com mapa ativo: mostra botão "Token"', () => {
    setMasterViewer();
    useMapStore.setState({
      active: {
        id: 'map-1',
        roomId: 'r1',
        name: 'Mapa',
        imageUrl: 'https://example.com/m.png',
        isActive: true,
        width: 1000,
        height: 800,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    });
    wrap(<MapView roomCode="ABC123" isMaster={true} />);
    expect(screen.getByRole('button', { name: /token/i })).toBeInTheDocument();
  });

  it('isMaster=false com mapa ativo: NÃO mostra botão "Token"', () => {
    setPlayerViewer();
    useMapStore.setState({
      active: {
        id: 'map-1',
        roomId: 'r1',
        name: 'Mapa',
        imageUrl: 'https://example.com/m.png',
        isActive: true,
        width: 1000,
        height: 800,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    });
    wrap(<MapView roomCode="ABC123" isMaster={false} />);
    expect(screen.queryByRole('button', { name: /token/i })).not.toBeInTheDocument();
  });
});
