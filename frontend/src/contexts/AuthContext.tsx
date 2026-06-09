/**
 * AuthContext — gerencia o usuário anônimo.
 *
 * Responsabilidades:
 *  - Gerar/persistir um `deviceId` (localStorage).
 *  - Chamar `authService.anonymous` no primeiro uso e armazenar o `User`.
 *  - Expor `{ user, isLoading, error, signIn, signOut }`.
 *
 * Stub: a chamada real ao backend entra na fase 5. O contexto já está
 * tipado e expõe a forma final da API.
 */
import { createContext, useCallback, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@/types';
import { newDeviceId, storage } from '@/utils';
import { authService } from '@/services';

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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // deviceId é gerado uma vez e persistido.
  const deviceId = useMemo(() => {
    const existing = storage.get<string | null>(DEVICE_ID_KEY, null);
    if (existing) return existing;
    const next = newDeviceId();
    storage.set(DEVICE_ID_KEY, next);
    return next;
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
      } finally {
        setIsLoading(false);
      }
    },
    [deviceId],
  );

  const signOut = useCallback(() => {
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
