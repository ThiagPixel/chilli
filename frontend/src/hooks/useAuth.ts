/**
 * useAuth — acesso ao contexto de autenticação.
 * Lógica de login/logout vive em `AuthContext`; este hook é só a ponte.
 */
import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '@/contexts/AuthContext';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  }
  return ctx;
}
