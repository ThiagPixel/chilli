/**
 * Testes do histórico de rolagens (Feature #1).
 *
 * Cobre:
 *   - Renderização básica de rolagens (com autor resolvido)
 *   - Paginação infinita (prependOlder no store, sem duplicar)
 *   - Filtro "só minhas" (com persistência em localStorage)
 *   - Botão "limpar" (clear local, store zerado)
 *   - Contador no header
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiceHistoryList, DiceHistoryPanel } from '@/components/dice';
import { useDiceStore } from '@/stores/dice.store';
import { usePlayersStore } from '@/stores/players.store';
import { renderWithProviders } from './utils';
import { ApiError } from '@/services/api';
import type { DiceRoll, User } from '@/types';

// Mock do socket (não vamos testar realtime aqui, só REST).
vi.mock('@/services/socket', () => ({
  getSocket: () => ({
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
    connected: false,
  }),
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
}));

// Mock do api (vai espiar history()).
const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));
vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      get: apiGet,
      post: vi.fn(),
    },
  };
});

const fakeUser: User = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Eu',
  email: 'me@chilli.device',
  avatarUrl: null,
  createdAt: '2026-06-11T00:00:00.000Z',
  updatedAt: '2026-06-11T00:00:00.000Z',
};

const fakeOther: User = {
  ...fakeUser,
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Outro',
};

function makeRoll(id: string, userId: string, ageMinutes: number): DiceRoll {
  const created = new Date(Date.now() - ageMinutes * 60_000).toISOString();
  return {
    id,
    roomId: 'room-id',
    userId,
    expression: '1d20',
    rolls: [15],
    modifier: 0,
    total: 15,
    createdAt: created,
  };
}

const myRollOld = makeRoll('roll-mine-1', fakeUser.id, 10);
const myRollNew = makeRoll('roll-mine-2', fakeUser.id, 1);
const otherRoll = makeRoll('roll-other-1', fakeOther.id, 5);

/** Configura o AuthProvider para retornar fakeUser em /me. */
function mockAuthAs(user: User) {
  apiGet.mockImplementation((url: string) => {
    if (url.includes('/api/auth/me')) {
      return Promise.resolve({ data: { user } });
    }
    return Promise.reject(new ApiError('NOT_FOUND', 'não encontrado', 404));
  });
}

/** Configura o AuthProvider para 401 em /me (visitante). */
function mockAuthUnauthenticated() {
  apiGet.mockRejectedValue(new ApiError('UNAUTHORIZED', 'Não autenticado', 401));
}

describe('DiceHistoryList (Feature #1)', () => {
  beforeEach(() => {
    apiGet.mockReset();
    useDiceStore.setState({ rolls: [], hasMore: true, isLoading: false });
    usePlayersStore.setState({ members: [] });
    localStorage.clear();
  });

  it('renderiza mensagem de vazio quando não há rolagens', () => {
    mockAuthUnauthenticated();
    renderWithProviders(<DiceHistoryList />);
    expect(screen.getByText(/nenhuma rolagem ainda/i)).toBeInTheDocument();
  });

  it('renderiza rolagens hidratadas com nome do autor', () => {
    mockAuthUnauthenticated();
    usePlayersStore.setState({
      members: [
        { user: fakeUser, role: 'player' },
        { user: fakeOther, role: 'player' },
      ],
    });
    useDiceStore.setState({ rolls: [myRollNew, otherRoll], hasMore: false });

    renderWithProviders(<DiceHistoryList />);
    expect(screen.getByText(/eu rolou 1d20/i)).toBeInTheDocument();
    expect(screen.getByText(/outro rolou 1d20/i)).toBeInTheDocument();
  });

  it('prependOlder adiciona rolagens antigas ao final do buffer (mais nova primeiro)', async () => {
    const olderBatch = [
      makeRoll('roll-old-1', fakeUser.id, 30),
      makeRoll('roll-old-2', fakeUser.id, 40),
    ];
    useDiceStore.setState({ rolls: [myRollNew], hasMore: true });

    await act(async () => {
      await useDiceStore.getState().prependOlder(olderBatch, false);
    });

    const state = useDiceStore.getState();
    expect(state.rolls.map((r) => r.id)).toEqual([
      'roll-mine-2', // mais nova
      'roll-old-1',
      'roll-old-2',
    ]);
    expect(state.hasMore).toBe(false);
  });

  it('prependOlder não duplica rolagens que já estão no buffer', async () => {
    useDiceStore.setState({ rolls: [myRollNew], hasMore: true });

    await act(async () => {
      await useDiceStore.getState().prependOlder([myRollNew, myRollOld], true);
    });

    const state = useDiceStore.getState();
    expect(state.rolls).toHaveLength(2);
    expect(state.rolls.map((r) => r.id).sort()).toEqual(['roll-mine-1', 'roll-mine-2']);
  });

  it('filtro "onlyMine" filtra a lista por currentUserId', () => {
    mockAuthAs(fakeUser);
    usePlayersStore.setState({
      members: [{ user: fakeUser, role: 'player' }, { user: fakeOther, role: 'player' }],
    });
    useDiceStore.setState({ rolls: [myRollNew, otherRoll, myRollOld] });

    // Passa currentUserId direto para não depender do timing do AuthProvider.
    renderWithProviders(<DiceHistoryList onlyMine currentUserId={fakeUser.id} />);
    expect(screen.getAllByText(/eu rolou 1d20/i)).toHaveLength(2);
    expect(screen.queryByText(/outro rolou/i)).not.toBeInTheDocument();
  });
});

describe('DiceHistoryPanel (Feature #1 — filtro + clear + persistência)', () => {
  beforeEach(() => {
    apiGet.mockReset();
    useDiceStore.setState({ rolls: [], hasMore: false, isLoading: false });
    usePlayersStore.setState({ members: [] });
    localStorage.clear();
  });

  it('filtro "só minhas" filtra a lista por user atual', async () => {
    mockAuthAs(fakeUser);
    usePlayersStore.setState({
      members: [{ user: fakeUser, role: 'player' }, { user: fakeOther, role: 'player' }],
    });
    useDiceStore.setState({ rolls: [myRollNew, otherRoll, myRollOld] });

    const user = userEvent.setup();
    renderWithProviders(<DiceHistoryPanel showTitle />);

    expect(screen.getAllByText(/rolou 1d20/i)).toHaveLength(3);
    await user.click(screen.getByRole('checkbox', { name: /só minhas/i }));
    expect(screen.getAllByText(/eu rolou 1d20/i)).toHaveLength(2);
    expect(screen.queryByText(/outro rolou/i)).not.toBeInTheDocument();
  });

  it('filtro "só minhas" persiste em localStorage', async () => {
    mockAuthUnauthenticated();
    const user = userEvent.setup();
    renderWithProviders(<DiceHistoryPanel showTitle />);

    await user.click(screen.getByRole('checkbox', { name: /só minhas/i }));
    expect(localStorage.getItem('chilli:dice:onlyMine')).toBe('1');
  });

  it('hidrata o filtro do localStorage no mount', () => {
    mockAuthUnauthenticated();
    localStorage.setItem('chilli:dice:onlyMine', '1');
    renderWithProviders(<DiceHistoryPanel showTitle />);
    expect(screen.getByRole('checkbox', { name: /só minhas/i })).toBeChecked();
  });

  it('botão "limpar" zera o store e fica disabled', async () => {
    mockAuthUnauthenticated();
    useDiceStore.setState({ rolls: [myRollNew] });
    const user = userEvent.setup();
    renderWithProviders(<DiceHistoryPanel showTitle />);

    // Espera o useEffect de onCountChange propagar.
    const clearBtn = await screen.findByRole('button', { name: /limpar histórico local/i });
    expect(clearBtn).not.toBeDisabled();

    await user.click(clearBtn);
    expect(useDiceStore.getState().rolls).toHaveLength(0);
    expect(clearBtn).toBeDisabled();
  });

  it('contador no header reflete o tamanho do store', async () => {
    mockAuthUnauthenticated();
    useDiceStore.setState({ rolls: [myRollNew, otherRoll, myRollOld] });
    renderWithProviders(<DiceHistoryPanel showTitle />);
    // O texto "Histórico (3)" é renderizado num único <span>.
    expect(await screen.findByText(/histórico \(3\)/i)).toBeInTheDocument();
  });
});
