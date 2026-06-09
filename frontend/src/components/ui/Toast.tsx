/**
 * Toast — Snackbar global. Provider fica em `main.tsx`.
 *
 * Conecta na `useToastStore` (Zustand). Quando chega um toast novo
 * (ou o current muda), exibe por `durationMs` e depois puxa o
 * próximo da fila.
 */
import { Alert, Snackbar } from '@mui/material';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useToastStore } from '@/stores/toast.store';

export interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const current = useToastStore((s) => s.current);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    if (!current) return undefined;
    const t = window.setTimeout(() => {
      dismiss();
    }, current.durationMs);
    return () => {
      window.clearTimeout(t);
    };
  }, [current, dismiss]);

  return (
    <>
      {children}
      {current ? (
        <Snackbar
          open
          onClose={(_, reason) => {
            if (reason === 'clickaway') return;
            dismiss();
          }}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            severity={current.severity}
            variant="filled"
            sx={{ width: '100%' }}
            onClose={dismiss}
          >
            {current.message}
          </Alert>
        </Snackbar>
      ) : null}
    </>
  );
}
