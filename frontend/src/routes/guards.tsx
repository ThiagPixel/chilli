/**
 * Guards de rota.
 *
 * - `RequireAuth` — só renderiza `children` se o usuário estiver autenticado.
 * - `RequireRoom` — só renderiza se o usuário for membro da sala (faz join
 *   automático se ainda não estiver na sala).
 */
import { useEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRoom } from '@/hooks/useRoom';
import { PATHS } from './paths';
import { Box, CircularProgress } from '@mui/material';
import type { ReactNode } from 'react';

export interface RequireAuthProps {
  children: ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }
  if (!user) {
    return <Navigate to={PATHS.home} replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

export interface RequireRoomProps {
  children: ReactNode;
}

export function RequireRoom({ children }: RequireRoomProps) {
  // Extrai o `code` do path param (rota é `r/:code`).
  const { code: codeParam } = useParams<{ code: string }>();
  const code = (codeParam ?? '').toUpperCase();

  const { user, isLoading: authLoading } = useAuth();
  const { isJoined, isJoining, error, join } = useRoom();

  // Tenta entrar na sala assim que tivermos user + code.
  // join() é idempotente no backend (membro ativo não duplica).
  useEffect(() => {
    if (authLoading || !user || !code) return;
    if (!isJoined && !isJoining) {
      void join(code);
    }
  }, [authLoading, user, isJoined, isJoining, code, join]);

  if (!code) {
    return <Navigate to={PATHS.home} replace />;
  }
  if (authLoading) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }
  if (isJoining || (!isJoined && !error)) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 240 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }
  if (error || !isJoined) {
    // Falha de join: redireciona para a tela de entrar com o código preenchido.
    return <Navigate to={`${PATHS.joinRoom}?code=${encodeURIComponent(code)}`} replace />;
  }
  return <>{children}</>;
}
