/**
 * MapView — aba "Mapa" da sala.
 *
 * Estrutura:
 *   - Mestre (isMaster): dropzone em cima + canvas embaixo.
 *   - Jogador: só o canvas.
 *
 * O mapa ativo vem de `useMapStore.active` (populado por `room:state` /
 * `map:updated` ou pelo upload). O mestre pode subir uma nova imagem
 * via `mapService.upload` — após o upload, o mapa é ativado e o
 * `map:state` é emitido com a viewport default.
 *
 * Pull-to-refresh: re-busca o mapa ativo do servidor (caso outro
 * mestre tenha feito upload sem o socket chegar — defesa contra
 * race conditions e reconexões).
 */
import { useCallback, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { MapCanvas } from './MapCanvas';
import { MapUploader } from './MapUploader';
import { useMapStore } from '@/stores/map.store';
import { useSocketContext } from '@/contexts/SocketContext';
import { mapService } from '@/services';
import { useToast } from '@/hooks/useToast';
import { RefreshableScroller } from '@/components/ui';

export interface MapViewProps {
  roomCode: string;
  isMaster: boolean;
}

export function MapView({ roomCode, isMaster }: MapViewProps) {
  const active = useMapStore((s) => s.active);
  const setActive = useMapStore((s) => s.setActive);
  const setActiveKeepView = useMapStore((s) => s.setActiveKeepView);
  const setView = useMapStore((s) => s.setView);
  const { socket } = useSocketContext();
  const toast = useToast();
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleUpload = async (file: File): Promise<void> => {
    setIsUploading(true);
    try {
      // Nome default = nome do arquivo sem extensão.
      const defaultName = file.name.replace(/\.[^.]+$/, '').slice(0, 100) || 'Mapa';
      const map = await mapService.upload(roomCode, file, defaultName);
      setActive(map);
      toast.success('Mapa enviado.');
      // Emite a viewport default (centro) para todos verem.
      socket.emit('map:state', { mapId: map.id, x: 0, y: 0, zoom: 1 });
      setView({ x: 0, y: 0, zoom: 1 });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha no upload';
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const maps = await mapService.list(roomCode);
      const current = maps.find((m) => m.isActive) ?? null;
      // Refresh preserva a viewport do usuário.
      setActiveKeepView(current);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao atualizar mapa';
      toast.error(message);
    }
  }, [roomCode, setActiveKeepView, toast]);

  return (
    <Stack sx={{ flex: 1, minHeight: 0 }} spacing={2}>
      {isMaster ? (
        <Box>
          <Typography variant="overline" color="text.secondary">
            Novo mapa
          </Typography>
          <Box sx={{ mt: 1 }}>
            <MapUploader onUpload={handleUpload} disabled={isUploading} />
          </Box>
        </Box>
      ) : null}

      <RefreshableScroller
        onRefresh={refresh}
        refreshLabel="Atualizar mapa"
        contentSx={{ display: 'flex' }}
      >
        <MapCanvas map={active} />
      </RefreshableScroller>
    </Stack>
  );
}
