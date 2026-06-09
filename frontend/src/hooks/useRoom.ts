/**
 * useRoom — acesso ao contexto da sala ativa.
 * Lógica de join/leave fica em `RoomContext`.
 */
import { useContext } from 'react';
import { RoomContext, type RoomContextValue } from '@/contexts/RoomContext';

export function useRoom(): RoomContextValue {
  const ctx = useContext(RoomContext);
  if (!ctx) {
    throw new Error('useRoom deve ser usado dentro de <RoomProvider>');
  }
  return ctx;
}
