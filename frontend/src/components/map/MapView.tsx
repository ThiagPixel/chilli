/**
 * MapView — aba "Mapa" da sala.
 *
 * Estrutura:
 *   - Mestre (isMaster): dropzone + lista de mapas + canvas.
 *   - Jogador: só o canvas.
 *
 * O mapa ativo vem de `useMapStore.active` (populado por `room:state` /
 * `map:updated` ou pelo upload). O mestre pode subir uma nova imagem
 * via `mapService.upload` — após o upload, o `maps:list` é broadcast
 * e a lista atualiza automaticamente.
 *
 * A lista de mapas (`MapListPanel`) é exibida apenas para o mestre e
 * reflete o estado global (realtime via `maps:list`).
 *
 * Pull-to-refresh: re-busca o mapa ativo do servidor (defesa contra race
 * conditions e reconexões).
 */
import { useCallback, useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { MapCanvas } from './MapCanvas';
import { MapUploader } from './MapUploader';
import { MapListPanel } from './MapListPanel';
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
  const maps = useMapStore((s) => s.maps);
  const upsertMap = useMapStore((s) => s.upsertMap);
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
      // Update otimista: o `maps:list` do servidor é a fonte de verdade,
      // mas inserimos já para feedback instantâneo.
      upsertMap(map);
      if (map.isActive) {
        setView({ x: 0, y: 0, zoom: 1 });
        socket.emit('map:state', { mapId: map.id, x: 0, y: 0, zoom: 1 });
      }
      toast.success('Mapa enviado.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha no upload';
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const fresh = await mapService.list(roomCode);
      const current = fresh.find((m) => m.isActive) ?? null;
      // Refresh preserva a viewport do usuário. Atualiza também a lista
      // para resincronizar com o servidor (caso algum maps:list tenha
      // se perdido).
      useMapStore.getState().setMaps(fresh);
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
          <Box sx={{ mt: 2 }}>
            <Typography variant="overline" color="text.secondary">
              Mapas da mesa ({maps.length})
            </Typography>
            <Box sx={{ mt: 1 }}>
              <MapListPanel roomCode={roomCode} maps={maps} />
            </Box>
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
