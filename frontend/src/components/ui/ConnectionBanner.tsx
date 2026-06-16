/**
 * ConnectionBanner — banner global que aparece quando o socket
 * está desconectado ou tentando reconectar.
 *
 * Comportamento:
 *   - `connected` true  → banner escondido.
 *   - `connected` false → banner aparece no topo da tela com
 *     mensagem "Reconectando…" e (se `onRetry` for passado) um
 *     botão "Tentar agora" para forçar `socket.connect()`.
 *   - Se ficar desconectado por mais de 10s, o banner ganha um
 *     destaque ("Sem conexão — tentativas a cada 5s").
 *
 * Auth-aware: o banner é suprimido quando o usuário não está
 * autenticado. O `SocketContext` desconecta intencionalmente o
 * socket quando `user === null` (auto-disconnect no logout /
 * pre-login), e mostrar "Sem conexão" nesse estado era confuso
 * para o usuário. Só mostramos o alerta em desconexões
 * inesperadas durante uso autenticado.
 *
 * Usa o `useSocketContext` para inspecionar `isConnected` quando
 * não receber a prop. Posicionado no topo, abaixo do TopBar
 * (via slot reservado no AppShell).
 */
import { useEffect, useState } from 'react';
import { Alert, Box, Button, Collapse } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useSocketContext } from '@/contexts/SocketContext';
import { useAuth } from '@/hooks/useAuth';

export interface ConnectionBannerProps {
  /** Se passado, sobrescreve o `isConnected` do contexto. */
  connected?: boolean;
  /** Callback para o botão "Tentar agora". Útil para testes. */
  onRetry?: () => void;
  /** Tempo (ms) até o banner mostrar a versão "Sem conexão" destacada. */
  warnAfterMs?: number;
}

export function ConnectionBanner({
  connected: connectedProp,
  onRetry,
  warnAfterMs = 10_000,
}: ConnectionBannerProps) {
  const { socket, isConnected: ctxConnected } = useSocketContext();
  const { user, isLoading: authLoading } = useAuth();
  const connected = connectedProp ?? ctxConnected;

  // Só mostramos o alerta em desconexões inesperadas durante uso
  // autenticado. Antes do login (ou durante `me()` ainda em flight)
  // o socket está disconnected por design — não é falha de rede.
  const shouldShow = !authLoading && user !== null && !connected;

  // Mede há quanto tempo está desconectado para mudar a severidade.
  // Só conta tempo quando o banner *deveria* estar visível (autenticado
  // e desconectado) — assim o `warnAfterMs` não acumula durante o
  // pre-login e dispara um "offline" falso ao entrar.
  const [disconnectedSince, setDisconnectedSince] = useState<number | null>(
    shouldShow ? Date.now() : null,
  );
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (!shouldShow) {
      setDisconnectedSince(null);
    } else if (disconnectedSince === null) {
      setDisconnectedSince(Date.now());
    }
  }, [shouldShow, disconnectedSince]);

  // Agenda um re-render quando os `warnAfterMs` se completam para
  // promover a severidade de "warning" para "error". Sem esse tick,
  // `showWarn` só muda se outra parte da árvore re-renderizar.
  useEffect(() => {
    if (disconnectedSince === null) return undefined;
    const remaining = warnAfterMs - (now - disconnectedSince);
    if (remaining <= 0) return undefined;
    const t = setTimeout(() => setNow(Date.now()), remaining);
    return () => clearTimeout(t);
  }, [now, disconnectedSince, warnAfterMs]);

  const showWarn =
    disconnectedSince !== null && now - disconnectedSince >= warnAfterMs;

  const handleRetry = (): void => {
    if (onRetry) {
      onRetry();
    } else {
      // Forçar reconexão: desconecta e reconecta.
      socket.disconnect();
      socket.connect();
    }
  };

  return (
    <Collapse in={shouldShow} unmountOnExit>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: (t) => t.zIndex.appBar - 1,
        }}
        data-testid="connection-banner"
        data-state={connected ? 'connected' : showWarn ? 'offline' : 'reconnecting'}
      >
        <Alert
          severity={showWarn ? 'error' : 'warning'}
          icon={<WifiOffIcon />}
          sx={{
            borderRadius: 0,
            py: 0.5,
          }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={handleRetry}
              data-testid="connection-banner-retry"
            >
              Tentar agora
            </Button>
          }
        >
          {showWarn
            ? 'Sem conexão — tentando reconectar…'
            : 'Reconectando…'}
        </Alert>
      </Box>
    </Collapse>
  );
}
