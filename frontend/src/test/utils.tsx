/**
 * Util para testes: renderiza um componente com os providers
 * mínimos do app. Reduz boilerplate nos specs.
 */
import { CssBaseline, ThemeProvider } from '@mui/material';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { type ReactElement, type ReactNode } from 'react';
import { theme } from '@/styles/theme';
import { AuthProvider } from '@/contexts/AuthContext';
import { RoomProvider } from '@/contexts/RoomContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { ToastProvider } from '@/components/ui/Toast';
import { MemoryRouter } from 'react-router-dom';

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  /** Pathname inicial (default `/`). */
  initialEntries?: string[];
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
): RenderResult {
  const { initialEntries = ['/'], ...rest } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MemoryRouter initialEntries={initialEntries}>
          <AuthProvider>
            <RoomProvider>
              <SocketProvider>
                <ToastProvider>{children}</ToastProvider>
              </SocketProvider>
            </RoomProvider>
          </AuthProvider>
        </MemoryRouter>
      </ThemeProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...rest });
}
