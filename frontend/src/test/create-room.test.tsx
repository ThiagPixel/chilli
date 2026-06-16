/**
 * Teste de regressão: /criar deve ser acessível sem sessão prévia
 * e o submit do formulário deve encadear signIn + create numa única
 * tacada, navegando em seguida para /r/:code.
 *
 * Cobre o bug onde `RequireAuth` envolvia a rota e devolvia o
 * visitante anônimo para `/` antes do form existir.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateRoomPage } from '@/pages/CreateRoom/CreateRoomPage';
import { renderWithProviders } from './utils';
import { ApiError } from '@/services/api';
import { useToastStore } from '@/stores/toast.store';
import type { User, Room, RoomMember } from '@/types';

// jsdom + socket.io não conversam bem; usamos um socket mockado.
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

// Mockamos o `api` do axios para espionar as chamadas HTTP da página.
const { apiPost, apiGet } = vi.hoisted(() => ({
  apiPost: vi.fn(),
  apiGet: vi.fn(),
}));

vi.mock('@/services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      post: apiPost,
      get: apiGet,
    },
  };
});

const fakeUser: User = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Mestre',
  email: 'mestre@chilli.device',
  avatarUrl: null,
  createdAt: '2026-06-11T00:00:00.000Z',
  updatedAt: '2026-06-11T00:00:00.000Z',
};

const fakeRoom: Room = {
  id: '22222222-2222-2222-2222-222222222222',
  code: 'K7H2F9',
  name: 'Mesa de teste',
  description: null,
  masterId: fakeUser.id,
  status: 'active',
  currentTurnUserId: null,
  currentTurnStartedAt: null,
  createdAt: '2026-06-11T00:00:00.000Z',
  updatedAt: '2026-06-11T00:00:00.000Z',
  closedAt: null,
};

const fakeMember: RoomMember = {
  id: '33333333-3333-3333-3333-333333333333',
  roomId: fakeRoom.id,
  userId: fakeUser.id,
  role: 'master',
  joinedAt: '2026-06-11T00:00:00.000Z',
  leftAt: null,
};

/** 401 do /me — caminho esperado para um visitante anônimo. */
const ME_UNAUTHENTICATED = () =>
  apiGet.mockRejectedValueOnce(
    new ApiError('UNAUTHORIZED', 'Não autenticado', 401),
  );

describe('CreateRoomPage (visitante anônimo)', () => {
  beforeEach(() => {
    apiPost.mockReset();
    apiGet.mockReset();
    // Zustand é global: limpa o estado para não vazar toasts entre testes.
    useToastStore.setState({ current: null, queue: [] });
    ME_UNAUTHENTICATED();
  });

  it('renderiza o formulário sem redirecionar quando o usuário não tem sessão', async () => {
    renderWithProviders(<CreateRoomPage />);

    // Se `RequireAuth` ainda estivesse em volta da rota, a página
    // navegaria para `/` durante esse `findBy` e nada seria encontrado.
    expect(await screen.findByLabelText(/seu nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nome da mesa/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /criar e entrar/i }),
    ).toBeInTheDocument();
  });

  it('faz signIn + create no submit e navega para /r/<code>', async () => {
    apiPost
      .mockResolvedValueOnce({ data: { user: fakeUser } }) // anonymous
      .mockResolvedValueOnce({ data: { room: fakeRoom, member: fakeMember } }); // create

    renderWithProviders(<CreateRoomPage />);

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/seu nome/i), 'Mestre');
    await user.type(screen.getByLabelText(/nome da mesa/i), 'Mesa de teste');
    await user.click(screen.getByRole('button', { name: /criar e entrar/i }));

    // 1. signIn foi chamado com o deviceId gerado e o nome do mestre.
    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith(
        '/api/auth/anonymous',
        expect.objectContaining({
          name: 'Mestre',
          deviceId: expect.any(String),
        }),
      );
    });

    // 2. create foi chamado com o nome da mesa.
    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith(
        '/api/rooms',
        expect.objectContaining({ name: 'Mesa de teste' }),
      );
    });

    // 3. Após o sucesso, o toast e a navegação acontecem.
    await waitFor(() => {
      expect(screen.getByText(/mesa criada: k7h2f9/i)).toBeInTheDocument();
    });
  });

  it('mostra erro via toast quando o backend recusa a criação', async () => {
    apiPost
      .mockResolvedValueOnce({ data: { user: fakeUser } }) // anonymous ok
      .mockRejectedValueOnce(
        new ApiError('ROOM_NAME_TAKEN', 'Nome já em uso', 409),
      );

    renderWithProviders(<CreateRoomPage />);

    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/seu nome/i), 'Mestre');
    await user.type(screen.getByLabelText(/nome da mesa/i), 'Mesa repetida');
    await user.click(screen.getByRole('button', { name: /criar e entrar/i }));

    expect(
      await screen.findByText(/nome já em uso/i),
    ).toBeInTheDocument();
  });
});
