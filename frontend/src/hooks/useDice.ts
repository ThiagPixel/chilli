/**
 * useDice — rolagens em tempo real.
 *
 * Stub: subscreve a `dice:result` e expõe `roll(expression)`.
 */
import { useCallback } from 'react';
import { useSocketEvent } from './useSocket';
import { useDiceStore } from '@/stores/dice.store';
import type { DiceRoll } from '@/types';

export function useDice(enabled = true) {
  const rolls = useDiceStore((s) => s.rolls);
  const add = useDiceStore((s) => s.add);
  const clear = useDiceStore((s) => s.clear);

  useSocketEvent('dice:result', (roll: DiceRoll) => add(roll), enabled);

  const roll = useCallback((_expression: string) => {
    // TODO fase 5: socket.emit('dice:roll', { expression })
    return Promise.resolve<DiceRoll | null>(null);
  }, []);

  return { rolls, roll, clear };
}
