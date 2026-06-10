/**
 * useDice — rolagens em tempo real.
 *
 * - `rolls`: snapshot da store (atualizada por `dice:result` e
 *   hidratada por `room:state`).
 * - `roll(expression)`: emite `dice:roll` no socket; resolve com a
 *   rolagem persistida (ou `null` em erro).
 */
import { useCallback } from 'react';
import { useSocketContext } from '@/contexts/SocketContext';
import { useDiceStore } from '@/stores/dice.store';
import { useToast } from '@/hooks/useToast';
import type { AckResult, DiceRoll } from '@/types';

export interface UseDiceResult {
  rolls: DiceRoll[];
  roll: (expression: string) => Promise<DiceRoll | null>;
  clear: () => void;
}

export function useDice(): UseDiceResult {
  const { socket } = useSocketContext();
  const rolls = useDiceStore((s) => s.rolls);
  const clear = useDiceStore((s) => s.clear);
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

  return { rolls, roll, clear };
}
