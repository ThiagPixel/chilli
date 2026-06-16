/**
 * MapView — aba "Mapa" da sala.
 *
 * Estrutura:
 *   - Mestre (isMaster): dropzone + lista de mapas + canvas + add token
 *     + indicador de turno.
 *   - Jogador: canvas + indicador de turno.
 *
 * O mapa ativo vem de `useMapStore.active` (populado por `room:state` /
 * `map:updated` ou pelo upload). O mestre pode subir uma nova imagem
 * via `mapService.upload` — após o upload, o `maps:list` é broadcast
 * e a lista atualiza automaticamente.
 *
 * A lista de mapas (`MapListPanel`) é exibida apenas para o mestre e
 * reflete o estado global (realtime via `maps:list`).
 *
 * Turno:
 *   - Topo do mapa: chip "Vez de {nome}" (todos veem).
 *   - Mestre: botão "Encerrar turno" no chip.
 *   - Mestre: botão flutuante "Adicionar token" sobre o canvas.
 *
 * Pull-to-refresh: re-busca o mapa ativo do servidor (defesa contra race
 * conditions e reconexões).
 */
import { useCallback, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import { MapCanvas } from './MapCanvas';
import { MapUploader } from './MapUploader';
import { MapListPanel } from './MapListPanel';
import { useMapStore } from '@/stores/map.store';
import { usePlayersStore } from '@/stores/players.store';
import { useTurnStore } from '@/stores/turn.store';
import { useSocketContext } from '@/contexts/SocketContext';
import { mapService, mapTokenService } from '@/services';
import { useToast } from '@/hooks/useToast';
import { RefreshableScroller } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useRoom } from '@/hooks/useRoom';

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
  const currentTurnUserId = useTurnStore((s) => s.currentTurnUserId);
  const members = usePlayersStore((s) => s.members);
  const { socket } = useSocketContext();
  const toast = useToast();
  const { user } = useAuth();
  const { room } = useRoom();
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isAddingToken, setIsAddingToken] = useState<boolean>(false);

  const turnHolder = currentTurnUserId
    ? members.find((m) => m.user.id === currentTurnUserId)?.user ?? null
    : null;
  const viewerIsMaster = user?.id === room?.masterId;
  const viewerIsTurnHolder = user !== null && user.id === currentTurnUserId;

  const handleUpload = async (file: File): Promise<void> => {
    setIsUploading(true);
    try {
      const defaultName = file.name.replace(/\.[^.]+$/, '').slice(0, 100) || 'Mapa';
      const map = await mapService.upload(roomCode, file, defaultName);
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
      useMapStore.getState().setMaps(fresh);
      setActiveKeepView(current);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao atualizar mapa';
      toast.error(message);
    }
  }, [roomCode, setActiveKeepView, toast]);

  const endTurn = (): void => {
    socket.emit('turn:end', {});
  };

  const handleAddToken = async (): Promise<void> => {
    if (!active) {
      toast.error('Selecione um mapa ativo para adicionar tokens.');
      return;
    }
    setIsAddingToken(true);
    try {
      // Token default = NPC genérico, posição centro do canvas (0,0
      // em image-space = canto superior-esquerdo da imagem).
      await mapTokenService.create(roomCode, active.id, {
        label: 'N',
        color: '#e53935',
        x: 0,
        y: 0,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha ao criar token';
      toast.error(message);
    } finally {
      setIsAddingToken(false);
    }
  };

  return (
    <Stack sx={{ flex: 1, minHeight: 0 }} spacing={2}>
      {/* Indicador de turno (sempre visível, quando há turno). */}
      {turnHolder ? (
        <Stack direction="row" alignItems="center" spacing={1}>
          <Chip
            icon={<PersonIcon />}
            label={`Vez de ${turnHolder.name}`}
            color={viewerIsTurnHolder ? 'primary' : 'default'}
            variant={viewerIsTurnHolder ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
          />
          {viewerIsMaster ? (
            <Button size="small" variant="text" onClick={endTurn}>
              Encerrar turno
            </Button>
          ) : null}
        </Stack>
      ) : null}

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

      <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <RefreshableScroller
          onRefresh={refresh}
          refreshLabel="Atualizar mapa"
          contentSx={{ display: 'flex' }}
        >
          <MapCanvas map={active} />
        </RefreshableScroller>

        {/* Botão flutuante de adicionar token (mestre only). */}
        {viewerIsMaster && active ? (
          <Tooltip title="Adicionar token NPC" placement="left">
            <Box sx={{ position: 'absolute', right: 8, top: 8, zIndex: 2 }}>
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddToken}
                disabled={isAddingToken}
              >
                Token
              </Button>
            </Box>
          </Tooltip>
        ) : null}
      </Box>
    </Stack>
  );
}
