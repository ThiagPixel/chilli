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
 * Usa o `useSocketContext` para inspecionar `isConnected` quando
 * não receber a prop. Posicionado no topo, abaixo do TopBar
 * (via slot reservado no AppShell).
 */
import { useEffect, useState } from 'react';
import { Alert, Box, Button, Collapse } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import { useSocketContext } from '@/contexts/SocketContext';

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
  const connected = connectedProp ?? ctxConnected;

  // Mede há quanto tempo está desconectado para mudar a severidade.
  const [disconnectedSince, setDisconnectedSince] = useState<number | null>(
    connected ? null : Date.now(),
  );
  useEffect(() => {
    if (connected) {
      setDisconnectedSince(null);
    } else if (disconnectedSince === null) {
      setDisconnectedSince(Date.now());
    }
  }, [connected, disconnectedSince]);

  const showWarn =
    disconnectedSince !== null && Date.now() - disconnectedSince >= warnAfterMs;

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
    <Collapse in={!connected} unmountOnExit>
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
