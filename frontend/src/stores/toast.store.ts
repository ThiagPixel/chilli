/**
 * toast.store — fila global de notificações.
 *
 * O ToastProvider consome daqui; useToast empurra para cá.
 * Mantemos o `current` separado da `queue` para evitar
 * o problema de "mostrou e sumiu" quando o usuário solta
 * várias chamadas em sequência.
 */
import { create } from 'zustand';

export type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  severity: ToastSeverity;
  durationMs: number;
}

export interface ToastInputPayload {
  message: string;
  severity?: ToastSeverity;
  durationMs?: number;
}

interface ToastState {
  current: ToastItem | null;
  queue: ToastItem[];
  push: (item: ToastInputPayload) => void;
  dismiss: () => void;
  shift: () => void;
}

const DEFAULT_DURATION = 4000;

export const useToastStore = create<ToastState>((set, get) => ({
  current: null,
  queue: [],
  push: (item) =>
    set((state) => {
      const next: ToastItem = {
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        severity: item.severity ?? 'info',
        message: item.message,
        durationMs: item.durationMs ?? DEFAULT_DURATION,
      };
      // Se não tem nada em tela, este é o current; caso contrário vai pra fila.
      if (!state.current) {
        return { current: next, queue: state.queue };
      }
      return { queue: [...state.queue, next] };
    }),
  dismiss: () => {
    const next = get().queue[0] ?? null;
    set((s) => ({ current: next, queue: s.queue.slice(1) }));
  },
  shift: () => {
    // Alias semântico de dismiss para o provider; mantemos ambos por
    // legibilidade de quem lê "de onde vem o próximo toast".
    const next = get().queue[0] ?? null;
    set((s) => ({ current: next, queue: s.queue.slice(1) }));
  },
}));
