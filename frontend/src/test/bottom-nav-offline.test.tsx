/**
 * Testes do dot offline no `BottomNav` (Feature #2 + fix auth-aware).
 *
 * Cobre:
 *   - Dot aparece quando user autenticado e isConnected=false.
 *   - Dot some quando isConnected=true.
 *   - Dot some quando user=null (pre-login) — auth-aware fix.
 *   - Dot some durante auth loading — auth-aware fix.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { MemoryRouter } from 'react-router-dom';
import { theme } from '@/styles/theme';
import { BottomNav, type RoomTab } from '@/components/layout/BottomNav';
import type { ReactNode } from 'react';

// Mock do socket.
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
  connect: vi.fn(),
  connected: false,
};
vi.mock('@/services/socket', () => ({
  getSocket: () => mockSocket,
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
}));

// Mock do SocketContext.
const { mockUseSocket } = vi.hoisted(() => ({ mockUseSocket: vi.fn() }));
vi.mock('@/contexts/SocketContext', () => ({
  useSocketContext: () => mockUseSocket(),
}));

// Mock do useAuth.
const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const fakeUser = { id: 'u-1', name: 'Test', avatarUrl: null };

function wrap(node: ReactNode) {
  return render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MemoryRouter initialEntries={['/r/ABC']}>{node}</MemoryRouter>
    </ThemeProvider>,
  );
}

describe('BottomNav (offline dot, auth-aware)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user autenticado e desconectado.
    mockUseAuth.mockReturnValue({
      user: fakeUser,
      isLoading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      deviceId: 'dev-1',
    });
    mockUseSocket.mockReturnValue({ socket: mockSocket, isConnected: false });
  });

  it('mostra dot offline quando isConnected=false e user autenticado', () => {
    wrap(<BottomNav active={'chat' as RoomTab} onChange={() => undefined} />);
    expect(screen.getByTestId('bottom-nav-offline-dot')).toBeInTheDocument();
  });

  it('esconde dot quando isConnected=true', () => {
    mockUseSocket.mockReturnValue({ socket: mockSocket, isConnected: true });
    wrap(<BottomNav active={'chat' as RoomTab} onChange={() => undefined} />);
    expect(screen.queryByTestId('bottom-nav-offline-dot')).not.toBeInTheDocument();
  });

  it('esconde dot quando user=null (pre-login), mesmo com isConnected=false', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      deviceId: 'dev-1',
    });
    mockUseSocket.mockReturnValue({ socket: mockSocket, isConnected: false });
    wrap(<BottomNav active={'chat' as RoomTab} onChange={() => undefined} />);
    expect(screen.queryByTestId('bottom-nav-offline-dot')).not.toBeInTheDocument();
  });

  it('esconde dot durante auth loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      deviceId: 'dev-1',
    });
    mockUseSocket.mockReturnValue({ socket: mockSocket, isConnected: false });
    wrap(<BottomNav active={'chat' as RoomTab} onChange={() => undefined} />);
    expect(screen.queryByTestId('bottom-nav-offline-dot')).not.toBeInTheDocument();
  });
});
