/**
 * AuthContext — gerencia o usuário anônimo.
 *
 * Responsabilidades:
 *  - Gerar/persistir um `deviceId` (localStorage).
 *  - No boot, tentar restaurar sessão via `authService.me()`
 *    (cookie httpOnly `chilli_token` sobe automaticamente).
 *  - `signIn(name, avatarUrl)` chama `authService.anonymous` e
 *    persiste nome/avatar localmente.
 *  - Expor `{ user, isLoading, error, signIn, signOut }`.
 */
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@/types';
import { newDeviceId, storage } from '@/utils';
import { authService } from '@/services';
import { ApiError } from '@/services/api';

const DEVICE_ID_KEY = 'deviceId';
const USER_NAME_KEY = 'userName';
const USER_AVATAR_KEY = 'userAvatar';

export interface AuthContextValue {
  user: User | null;
  deviceId: string;
  isLoading: boolean;
  error: string | null;
  signIn: (name: string, avatarUrl?: string | null) => Promise<void>;
  signOut: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // deviceId é gerado uma vez e persistido.
  const deviceId = useMemo(() => {
    const existing = storage.get<string | null>(DEVICE_ID_KEY, null);
    if (existing) return existing;
    const next = newDeviceId();
    storage.set(DEVICE_ID_KEY, next);
    return next;
  }, []);

  // No boot, tenta restaurar sessão via cookie.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await authService.me();
        if (!cancelled) setUser(me);
      } catch (e) {
        // 401 esperado para primeira visita; qualquer outro erro é silencioso.
        if (e instanceof ApiError && e.status === 401) {
          // ok — sem sessão
        } else if (!cancelled) {
          const message = e instanceof Error ? e.message : 'Falha ao restaurar sessão';
          setError(message);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(
    async (name: string, avatarUrl?: string | null) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await authService.anonymous({
          deviceId,
          name: name.trim(),
          ...(avatarUrl ? { avatarUrl } : {}),
        });
        storage.set(USER_NAME_KEY, res.user.name);
        if (res.user.avatarUrl) storage.set(USER_AVATAR_KEY, res.user.avatarUrl);
        setUser(res.user);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Falha ao autenticar';
        setError(message);
        throw e;
      } finally {
        setIsLoading(false);
      }
    },
    [deviceId],
  );

  const signOut = useCallback(() => {
    // Backend ainda não tem endpoint de logout (MVP). Limpa estado local.
    setUser(null);
    storage.remove(USER_NAME_KEY);
    storage.remove(USER_AVATAR_KEY);
  }, []);

  const value: AuthContextValue = {
    user,
    deviceId,
    isLoading,
    error,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
