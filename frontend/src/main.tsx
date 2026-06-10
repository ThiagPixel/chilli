/**
 * Bootstrap do app.
 *
 * Ordem dos providers (de fora pra dentro):
 *   - ThemeProvider: tipografia, cores, breakpoints.
 *   - CssBaseline: reset MUI.
 *   - AuthProvider, RoomProvider, SocketProvider: contextos de domínio.
 *   - ToastProvider: feedback de ações.
 *   - AppRouter: roteamento.
 */
import { CssBaseline, ThemeProvider } from '@mui/material';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { theme } from '@/styles/theme';
import { AuthProvider } from '@/contexts/AuthContext';
import { RoomProvider } from '@/contexts/RoomContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { ToastProvider } from '@/components/ui/Toast';
import { AppRouter } from '@/routes';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@/styles/global.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Elemento #root não encontrado no DOM.');
}

createRoot(container).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <SocketProvider>
          <RoomProvider>
            <ToastProvider>
              <AppRouter />
            </ToastProvider>
          </RoomProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
