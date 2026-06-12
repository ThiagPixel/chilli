/**
 * useDice — rolagens em tempo real + paginação.
 *
 * - `rolls` / `hasMore` / `isLoading` — snapshot da store.
 * - `roll(expression)` — emite `dice:roll` no socket; resolve com a
 *   rolagem persistida (ou `null` em erro).
 * - `loadMore()` — busca rolagens mais antigas via REST
 *   (`GET /api/rooms/:code/rolls?before=<iso>&limit=N`) e prepende
 *   no store. Usado pelo infinite-scroll da UI.
 * - `refresh()` — re-busca o histórico mais recente e substitui
 *   o buffer (defesa contra race ou reconexão).
 */
import { useCallback } from 'react';
import { useSocketContext } from '@/contexts/SocketContext';
import { useDiceStore } from '@/stores/dice.store';
import { useRoom } from '@/hooks/useRoom';
import { diceService } from '@/services';
import { useToast } from '@/hooks/useToast';
import type { AckResult, DiceRoll } from '@/types';

const PAGE_SIZE = 50;

export interface UseDiceResult {
  rolls: DiceRoll[];
  hasMore: boolean;
  isLoading: boolean;
  roll: (expression: string) => Promise<DiceRoll | null>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  clear: () => void;
}

export function useDice(): UseDiceResult {
  const { socket } = useSocketContext();
  const { room } = useRoom();
  const rolls = useDiceStore((s) => s.rolls);
  const hasMore = useDiceStore((s) => s.hasMore);
  const isLoading = useDiceStore((s) => s.isLoading);
  const clear = useDiceStore((s) => s.clear);
  const setLoading = useDiceStore((s) => s.setLoading);
  const prependOlder = useDiceStore((s) => s.prependOlder);
  const hydrate = useDiceStore((s) => s.hydrate);
  const toast = useToast();

  const roll = useCallback(
    (expression: string): Promise<DiceRoll | null> => {
      const trimmed = expression.trim();
      if (!trimmed) return Promise.resolve(null);
      return new Promise<DiceRoll | null>((resolve) => {
        socket.emit('dice:roll', { expression: trimmed }, (ack: AckResult<DiceRoll>) => {
          if (ack.ok && ack.data) {
            resolve(ack.data);
            return;
          }
          const msg = ack.error?.message ?? 'Falha ao rolar dados';
          toast.error(msg);
          resolve(null);
        });
      });
    },
    [socket, toast],
  );

  const loadMore = useCallback(async (): Promise<void> => {
    if (isLoading || !hasMore) return;
    const state = useDiceStore.getState();
    const oldest = state.rolls[state.rolls.length - 1];
    if (!oldest || !room?.code) return;

    setLoading(true);
    try {
      const older = await diceService.history(room.code, oldest.createdAt, PAGE_SIZE);
      // Se o server devolveu menos que `PAGE_SIZE`, não há mais.
      const moreAvailable = older.length >= PAGE_SIZE;
      prependOlder(older, moreAvailable);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao carregar histórico';
      toast.error(message);
      setLoading(false);
    }
  }, [isLoading, hasMore, room?.code, setLoading, prependOlder, toast]);

  const refresh = useCallback(async (): Promise<void> => {
    if (!room?.code) return;
    setLoading(true);
    try {
      const fresh = await diceService.history(room.code, undefined, PAGE_SIZE);
      hydrate(fresh);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao atualizar rolagens';
      toast.error(message);
      setLoading(false);
    }
  }, [room?.code, setLoading, hydrate, toast]);

  return { rolls, hasMore, isLoading, roll, loadMore, refresh, clear };
}
