/**
 * Guards de rota.
 *
 * - `RequireAuth` — só renderiza `children` se o usuário estiver autenticado.
 * - `RequireRoom` — só renderiza se o usuário for membro da sala.
 *
 * Modo stub (fase 5): as guards existem para plugar quando a
 * autenticação real chegar. Por enquanto são **permissivas** —
 * sempre deixam passar — para que toda a UI fique navegável
 * durante o desenvolvimento visual. Troque `STUB_PERMISSIVE_GUARDS`
 * para `false` quando o backend estiver pronto.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoom } from '@/hooks/useRoom';
import { PATHS } from './paths';
import type { ReactNode } from 'react';

const STUB_PERMISSIVE_GUARDS = true;

export interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (STUB_PERMISSIVE_GUARDS) return <>{children}</>;

  if (isLoading) {
    return null; // Suspense/loading fica a cargo do layout
  }
  if (!user) {
    return <Navigate to={PATHS.home} replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

export interface RequireRoomProps {
  children: ReactNode;
  /** Código de sala extraído dos params. */
  code: string;
}

export function RequireRoom({ children, code: _code }: RequireRoomProps) {
  const { isJoined, isJoining, join } = useRoom();
  void join;
  if (STUB_PERMISSIVE_GUARDS) return <>{children}</>;
  if (isJoining) return null;
  if (!isJoined) return <Navigate to={PATHS.joinRoom} replace />;
  return <>{children}</>;
}
