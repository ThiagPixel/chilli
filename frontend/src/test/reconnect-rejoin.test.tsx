/**
 * Testes do rejoin automático após reconexão (Feature #2.2).
 *
 * Verifica que, quando o socket reconecta, o `RoomContext` re-emite
 * `room:join` com o código da sala atual e re-hidrata as stores
 * com o RoomState devolvido pelo server.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from '@/styles/theme';
import { RoomProvider } from '@/contexts/RoomContext';
import { useRoom } from '@/hooks/useRoom';
import { useDiceStore } from '@/stores/dice.store';
import { useChatStore } from '@/stores/chat.store';
import { usePlayersStore } from '@/stores/players.store';
import { useMapStore } from '@/stores/map.store';
import type { ReactNode } from 'react';
import type { RoomState, User, Room, RoomMap } from '@/types';

// Socket mockado. Usamos um Map de listeners para podermos
// emitir `connect` manualmente.
type SocketListener = ((...args: unknown[]) => void) | ((reason: string) => void);

const listeners = new Map<string, SocketListener[]>();
const mockSocket = {
  emit: vi.fn(),
  on: vi.fn((event: string, listener: SocketListener) => {
    const list = listeners.get(event) ?? [];
    list.push(listener);
    listeners.set(event, list);
  }),
  off: vi.fn((event: string, listener: SocketListener) => {
    const list = listeners.get(event) ?? [];
    listeners.set(
      event,
      list.filter((l) => l !== listener),
    );
  }),
  disconnect: vi.fn(),
  connect: vi.fn(),
  connected: false,
};

vi.mock('@/services/socket', () => ({
  getSocket: () => mockSocket,
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
}));

// Estado controlado: isConnected alterna entre false e true.
let mockIsConnected = true;
const mockUseSocket = vi.fn(() => ({ socket: mockSocket, isConnected: mockIsConnected }));
vi.mock('@/contexts/SocketContext', () => ({
  useSocketContext: () => mockUseSocket(),
}));

// Auth mockado — evita que o AuthProvider faça chamadas reais.
vi.mock('@/services/auth.service', () => ({
  authService: {
    me: vi.fn().mockRejectedValue(new Error('401')),
    anonymous: vi.fn().mockResolvedValue({ user: { id: 'user-1' } }),
  },
}));

// Fixtures e mocks de room service precisam de vi.hoisted (vi.mock
// é içada antes das declarações top-level).
const { fakeRoom: hoistedRoom, fakeUser: hoistedUser } = vi.hoisted(() => ({
  fakeRoom: {
    id: 'room-1',
    code: 'K7H2F9',
    name: 'Mesa',
    description: null,
    masterId: 'user-1',
    status: 'active' as const,
    createdAt: '2026-06-11T00:00:00.000Z',
    updatedAt: '2026-06-11T00:00:00.000Z',
    closedAt: null,
  },
  fakeUser: {
    id: 'user-1',
    name: 'Eu',
    email: 'me@chilli.device',
    avatarUrl: null,
    createdAt: '2026-06-11T00:00:00.000Z',
    updatedAt: '2026-06-11T00:00:00.000Z',
  },
}));

vi.mock('@/services/room.service', () => ({
  roomService: {
    join: vi.fn().mockResolvedValue({ room: hoistedRoom, alreadyMember: true }),
    getByCode: vi.fn().mockResolvedValue(hoistedRoom),
    listMembers: vi.fn().mockResolvedValue([{ user: hoistedUser, role: 'master' }]),
  },
}));

const fakeUser: User = {
  id: 'user-1',
  name: 'Eu',
  email: 'me@chilli.device',
  avatarUrl: null,
  createdAt: '2026-06-11T00:00:00.000Z',
  updatedAt: '2026-06-11T00:00:00.000Z',
};

const fakeRoom: Room = {
  id: 'room-1',
  code: 'K7H2F9',
  name: 'Mesa',
  description: null,
  masterId: 'user-1',
  status: 'active',
  createdAt: '2026-06-11T00:00:00.000Z',
  updatedAt: '2026-06-11T00:00:00.000Z',
  closedAt: null,
};

const fakeMap: RoomMap = {
  id: 'map-1',
  roomId: 'room-1',
  name: 'Mapa 1',
  imageUrl: '/uploads/maps/1.png',
  width: null,
  height: null,
  isActive: true,
  createdAt: '2026-06-11T00:00:00.000Z',
  updatedAt: '2026-06-11T00:00:00.000Z',
};

function makeRoomState(): RoomState {
  return {
    room: fakeRoom,
    members: [{ user: fakeUser, role: 'master' }],
    recentMessages: [
      {
        id: 'msg-1',
        roomId: 'room-1',
        userId: 'user-1',
        type: 'text',
        content: 'oi',
        createdAt: '2026-06-11T00:00:00.000Z',
      },
    ],
    recentRolls: [
      {
        id: 'roll-1',
        roomId: 'room-1',
        userId: 'user-1',
        expression: '1d20',
        rolls: [15],
        modifier: 0,
        total: 15,
        createdAt: '2026-06-11T00:00:00.000Z',
      },
    ],
    activeMap: fakeMap,
    maps: [fakeMap],
  };
}

function wrap(node: ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/r/K7H2F9']}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Routes>
          <Route
            path="/r/:code"
            element={
              <RoomProvider>
                <TestChild />
              </RoomProvider>
            }
          />
        </Routes>
        {node}
      </ThemeProvider>
    </MemoryRouter>,
  );
}

function TestChild() {
  const { room, join, isJoined } = useRoom();
  return (
    <div>
      <span data-testid="room-code">{room?.code ?? ''}</span>
      <span data-testid="is-joined">{isJoined ? '1' : '0'}</span>
      <button data-testid="do-join" onClick={() => void join('K7H2F9')}>
        Entrar
      </button>
    </div>
  );
}

function emitSocketConnect() {
  const list = listeners.get('connect') ?? [];
  for (const l of list) (l as () => void)();
}

describe('RoomContext rejoin após reconexão (Feature #2.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeners.clear();
    mockIsConnected = true;
    useDiceStore.setState({ rolls: [], hasMore: true, isLoading: false });
    useChatStore.setState({ messages: [] });
    usePlayersStore.setState({ members: [] });
    useMapStore.setState({ active: null, view: { x: 0, y: 0, zoom: 1 } });
  });

  it('re-emite room:join quando o socket reconecta após estar joined', async () => {
    // 1ª chamada: join inicial.
    mockSocket.emit.mockImplementationOnce(
      (event: string, _payload: unknown, ack: (res: unknown) => void) => {
        if (event === 'room:join') {
          ack({ ok: true, data: makeRoomState() });
        }
      },
    );
    // 2ª chamada: rejoin após reconnect.
    mockSocket.emit.mockImplementationOnce(
      (event: string, _payload: unknown, ack: (res: unknown) => void) => {
        if (event === 'room:join') {
          // Server devolve um RoomState "fresco" com rolls novos.
          const fresh = makeRoomState();
          fresh.recentRolls = [
            {
              id: 'roll-2',
              roomId: 'room-1',
              userId: 'user-1',
              expression: '2d6',
              rolls: [4, 6],
              modifier: 0,
              total: 10,
              createdAt: '2026-06-11T00:00:01.000Z',
            },
          ];
          ack({ ok: true, data: fresh });
        }
      },
    );

    wrap(<></>);
    // Clica no botão "Entrar" para disparar o join inicial.
    act(() => {
      fireEvent.click(screen.getByTestId('do-join'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('is-joined').textContent).toBe('1');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'room:join',
      { code: 'K7H2F9' },
      expect.anything(),
    );

    // Simula socket reconnect.
    act(() => {
      emitSocketConnect();
    });

    // Após o reconnect, o room:join deve ter sido re-emitido e o
    // store de dice deve refletir os rolls frescos.
    await waitFor(() => {
      const state = useDiceStore.getState();
      expect(state.rolls.map((r) => r.id)).toContain('roll-2');
    });
  });
});
