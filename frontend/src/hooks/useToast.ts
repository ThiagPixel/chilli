/**
 * useToast — feedback de ações (erro/sucesso).
 *
 * Encaminha para a `useToastStore` (fila global consumida pelo
 * `<ToastProvider />`). API estável para que componentes possam
 * chamar sem se preocupar com a implementação por baixo.
 */
import { useCallback } from 'react';
import { useToastStore, type ToastSeverity } from '@/stores/toast.store';

export type { ToastSeverity };

export interface ToastInput {
  message: string;
  severity?: ToastSeverity;
  durationMs?: number;
}

export interface ToastApi {
  show: (input: ToastInput) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

export function useToast(): ToastApi {
  const push = useToastStore((s) => s.push);

  return {
    show: useCallback(
      (input: ToastInput) => {
        push({
          message: input.message,
          ...(input.severity ? { severity: input.severity } : {}),
          ...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
        });
      },
      [push],
    ),
    success: useCallback((m: string) => push({ message: m, severity: 'success' }), [push]),
    error: useCallback((m: string) => push({ message: m, severity: 'error' }), [push]),
    info: useCallback((m: string) => push({ message: m, severity: 'info' }), [push]),
    warning: useCallback((m: string) => push({ message: m, severity: 'warning' }), [push]),
  };
}
