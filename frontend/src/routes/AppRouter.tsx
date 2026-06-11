/**
 * Router config.
 *
 * - `createBrowserRouter` (data router) com lazy loading por rota.
 * - AppShell envolve todas as rotas autenticadas.
 * - Rota `*` → NotFound (placeholder; vira página real na fase 5).
 */
import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from '@/components/layout';
import { PATHS } from './paths';
import { RequireAuth, RequireRoom } from './guards';
import { Box, CircularProgress } from '@mui/material';

// Lazy load por rota — TTI da Home não paga o custo da Room.
const HomePage = lazy(() => import('@/pages/Home/HomePage').then((m) => ({ default: m.HomePage })));
const CreateRoomPage = lazy(() =>
  import('@/pages/CreateRoom/CreateRoomPage').then((m) => ({ default: m.CreateRoomPage })),
);
const JoinRoomPage = lazy(() =>
  import('@/pages/JoinRoom/JoinRoomPage').then((m) => ({ default: m.JoinRoomPage })),
);
const RoomPage = lazy(() => import('@/pages/Room/RoomPage').then((m) => ({ default: m.RoomPage })));
const NotFoundPage = lazy(() =>
  import('@/pages/NotFound/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);

/** Fallback de Suspense. */
function PageLoader() {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 240,
      }}
    >
      <CircularProgress size={32} />
    </Box>
  );
}

function withSuspense(node: React.ReactNode) {
  return <Suspense fallback={<PageLoader />}>{node}</Suspense>;
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: withSuspense(<HomePage />) },
      {
        // `CreateRoomPage` faz o primeiro signIn do usuário (sem sessão),
        // então ela mesma não pode ficar atrás de `RequireAuth` — senão
        // o guard joga o visitante de volta pra `/` antes do form existir.
        path: PATHS.createRoom.slice(1),
        element: withSuspense(<CreateRoomPage />),
      },
      {
        path: PATHS.joinRoom.slice(1),
        element: withSuspense(<JoinRoomPage />),
      },
      {
        path: 'r/:code',
        element: (
          <RequireAuth>
            <RequireRoom>{withSuspense(<RoomPage />)}</RequireRoom>
          </RequireAuth>
        ),
      },
      {
        path: '*',
        element: withSuspense(<NotFoundPage />),
      },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
