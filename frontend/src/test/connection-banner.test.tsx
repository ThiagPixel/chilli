/**
 * Testes do banner de reconexão (Feature #2 + fix de auth-aware).
 *
 * Cobre:
 *   - Banner aparece quando user autenticado e isConnected=false.
 *   - Banner some quando isConnected=true.
 *   - Botão "Tentar agora" chama onRetry ou socket.connect.
 *   - useSocketContext é consumido corretamente.
 *   - Auth-aware: banner ESCONDIDO quando user é null ou isLoading=true
 *     (socket disconnected por design antes do login).
 *   - useAuth é consumido corretamente.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, render, fireEvent, act } from '@testing-library/react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from '@/styles/theme';
import { ConnectionBanner } from '@/components/ui';
import type { ReactNode } from 'react';

// Mock do socket. O mockSocketRef fica acessível para os testes
// poderem verificar chamadas.
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn(),
  off: vi.fn(),
  disconnect: vi.fn(),
  connect: vi.fn(),
  connected: false,
};

const mockSocketRef = { current: mockSocket };
vi.mock('@/services/socket', () => ({
  getSocket: () => mockSocketRef.current,
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
}));

// Mock do SocketContext — controla isConnected.
const { mockUseSocket } = vi.hoisted(() => ({ mockUseSocket: vi.fn() }));
vi.mock('@/contexts/SocketContext', () => ({
  useSocketContext: () => mockUseSocket(),
}));

// Mock do useAuth — controla user/isLoading.
const { mockUseAuth } = vi.hoisted(() => ({ mockUseAuth: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

const fakeUser = { id: 'u-1', name: 'Test', avatarUrl: null };

function wrap(node: ReactNode) {
  return render(
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {node}
    </ThemeProvider>,
  );
}

describe('ConnectionBanner (Feature #2 + auth-aware fix)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: user autenticado e desconectado (caso de uso real do banner).
    mockUseAuth.mockReturnValue({
      user: fakeUser,
      isLoading: false,
      isLoading_legacy: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      deviceId: 'dev-1',
    });
    mockUseSocket.mockReturnValue({ socket: mockSocket, isConnected: false });
  });

  it('mostra banner quando isConnected=false e user autenticado', () => {
    wrap(<ConnectionBanner />);
    const banner = screen.getByTestId('connection-banner');
    expect(banner).toBeInTheDocument();
    expect(banner.getAttribute('data-state')).toBe('reconnecting');
    expect(screen.getByText(/reconectando/i)).toBeInTheDocument();
  });

  it('esconde banner quando isConnected=true', () => {
    mockUseSocket.mockReturnValue({ socket: mockSocket, isConnected: true });
    wrap(<ConnectionBanner />);
    expect(screen.queryByTestId('connection-banner')).not.toBeInTheDocument();
  });

  it('botão "Tentar agora" chama onRetry quando passado', () => {
    const onRetry = vi.fn();
    wrap(<ConnectionBanner onRetry={onRetry} />);
    fireEvent.click(screen.getByTestId('connection-banner-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('botão "Tentar agora" chama socket.connect quando onRetry ausente', () => {
    wrap(<ConnectionBanner />);
    fireEvent.click(screen.getByTestId('connection-banner-retry'));
    expect(mockSocket.disconnect).toHaveBeenCalled();
    expect(mockSocket.connect).toHaveBeenCalled();
  });

  it('aceita prop `connected` para sobrescrever o contexto', () => {
    mockUseSocket.mockReturnValue({ socket: mockSocket, isConnected: false });
    wrap(<ConnectionBanner connected={true} />);
    expect(screen.queryByTestId('connection-banner')).not.toBeInTheDocument();
  });

  it('muda para "offline" após warnAfterMs', () => {
    vi.useFakeTimers({ now: 0 });
    try {
      mockUseSocket.mockReturnValue({ socket: mockSocket, isConnected: false });
      wrap(<ConnectionBanner warnAfterMs={1000} />);
      // Inicialmente "reconnecting".
      const banner = screen.getByTestId('connection-banner');
      expect(banner.getAttribute('data-state')).toBe('reconnecting');

      // Avança o tempo além do warnAfterMs. O useEffect agenda um
      // setTimeout que dispara setNow, forçando re-render com a
      // severidade "error"/data-state="offline".
      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(screen.getByTestId('connection-banner').getAttribute('data-state'))
        .toBe('offline');
      expect(screen.getByText(/sem conexão/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  // ---- Auth-aware (fix do bug "sem conexão" pré-login) ----------------

  it('esconde banner quando user=null (pre-login), mesmo com isConnected=false', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      deviceId: 'dev-1',
    });
    mockUseSocket.mockReturnValue({ socket: mockSocket, isConnected: false });
    wrap(<ConnectionBanner />);
    expect(screen.queryByTestId('connection-banner')).not.toBeInTheDocument();
  });

  it('esconde banner durante auth loading (me() em flight), mesmo com isConnected=false', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      deviceId: 'dev-1',
    });
    mockUseSocket.mockReturnValue({ socket: mockSocket, isConnected: false });
    wrap(<ConnectionBanner />);
    expect(screen.queryByTestId('connection-banner')).not.toBeInTheDocument();
  });

  it('esconde banner durante loading mesmo se user está set (transição segura)', () => {
    // Durante loading, não sabemos o estado final do user.
    // Política conservadora: esconder. (Caso oposto — user set,
    // loading false, isConnected false — é coberto pelo primeiro
    // teste, que é o caminho real do bug fix.)
    mockUseAuth.mockReturnValue({
      user: fakeUser,
      isLoading: true,
      error: null,
      signIn: vi.fn(),
      signOut: vi.fn(),
      deviceId: 'dev-1',
    });
    mockUseSocket.mockReturnValue({ socket: mockSocket, isConnected: false });
    wrap(<ConnectionBanner />);
    expect(screen.queryByTestId('connection-banner')).not.toBeInTheDocument();
  });

  it('não acumula disconnectedSince durante pre-login (warnAfterMs não dispara falso offline)', () => {
    vi.useFakeTimers({ now: 0 });
    try {
      // Pre-login: banner escondido, disconnectedSince deve ficar null.
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        deviceId: 'dev-1',
      });
      mockUseSocket.mockReturnValue({ socket: mockSocket, isConnected: false });
      wrap(<ConnectionBanner warnAfterMs={1000} />);
      expect(screen.queryByTestId('connection-banner')).not.toBeInTheDocument();

      // Avança 30s (muito além do warnAfterMs).
      act(() => {
        vi.advanceTimersByTime(30_000);
      });

      // Agora autentica: o banner deve aparecer como "reconnecting"
      // (warnAfterMs não deve ter acumulado tempo pré-login).
      mockUseAuth.mockReturnValue({
        user: fakeUser,
        isLoading: false,
        error: null,
        signIn: vi.fn(),
        signOut: vi.fn(),
        deviceId: 'dev-1',
      });
      wrap(<ConnectionBanner warnAfterMs={1000} />);
      const banner = screen.getByTestId('connection-banner');
      expect(banner.getAttribute('data-state')).toBe('reconnecting');
    } finally {
      vi.useRealTimers();
    }
  });
});
