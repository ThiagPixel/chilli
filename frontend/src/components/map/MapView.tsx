/**
 * MapView — aba "Mapa" da sala.
 *
 * Estrutura:
 *   - Mestre (isMaster): dropzone em cima + canvas embaixo.
 *   - Jogador: só o canvas.
 *
 * Stub: o estado de mapa ativo (id, imageUrl) virá da store
 * `useMapStore` + Socket.IO (`map:updated`) na fase 5. Por
 * enquanto o canvas mostra "Sem mapa ativo" e o uploader
 * dispara um toast.
 */
import { Box, Stack, Typography } from '@mui/material';
import { MapCanvas } from './MapCanvas';
import { MapUploader } from './MapUploader';
import { useMapStore } from '@/stores/map.store';
import { useToast } from '@/hooks/useToast';

export interface MapViewProps {
  roomCode: string;
  isMaster: boolean;
}

export function MapView({ roomCode: _code, isMaster }: MapViewProps) {
  const activeMapId = useMapStore((s) => s.activeMapId);
  const toast = useToast();

  // Stub — na fase 5 isso vem de `useMapStore.mapById(activeMapId)`.
  const activeMap = activeMapId
    ? null // { id, imageUrl, name, ... } seria populado pelo socket
    : null;

  const handleUpload = (_file: File) => {
    // Stub: mapService.upload é o caminho real.
    toast.info('Upload de mapa chega na próxima fase.');
  };

  return (
    <Stack sx={{ flex: 1, minHeight: 0 }} spacing={2}>
      {isMaster ? (
        <Box>
          <Typography variant="overline" color="text.secondary">
            Novo mapa
          </Typography>
          <Box sx={{ mt: 1 }}>
            <MapUploader onUpload={handleUpload} />
          </Box>
        </Box>
      ) : null}

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <MapCanvas map={activeMap} />
      </Box>
    </Stack>
  );
}
