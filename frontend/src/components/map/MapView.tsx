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
 */
import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { MapCanvas } from './MapCanvas';
import { MapUploader } from './MapUploader';
import { useMapStore } from '@/stores/map.store';
import { useSocketContext } from '@/contexts/SocketContext';
import { mapService } from '@/services';
import { useToast } from '@/hooks/useToast';

export interface MapViewProps {
  roomCode: string;
  isMaster: boolean;
}

export function MapView({ roomCode, isMaster }: MapViewProps) {
  const active = useMapStore((s) => s.active);
  const setActive = useMapStore((s) => s.setActive);
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

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <MapCanvas map={active} />
      </Box>
    </Stack>
  );
}
