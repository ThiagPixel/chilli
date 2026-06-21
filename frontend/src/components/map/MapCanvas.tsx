/**
 * MapCanvas — área do mapa com pan/zoom.
 *
 * Gestos suportados:
 *   - Mouse: arrastar com botão esquerdo para mover; scroll para zoom.
 *   - Touch: arrastar com 1 dedo para mover.
 *   - Botões +/- e slider para zoom acessível.
 *
 * A viewport (x/y/zoom) é fonte de verdade no `useMapStore`; este
 * componente só lê e escreve lá. Toda mudança local é replicada
 * via `socket.emit('map:state', ...)` para que outros membros
 * vejam a mesma viewport. O broadcast é debounced (80ms) para
 * evitar spam durante o arrasto.
 *
 * Persistência por usuário:
 *   - `usePersistedMapView` lê/escreve a view do (roomCode, mapId) em
 *     localStorage, então o refresh preserva a viewport individual.
 *
 * Tokens:
 *   - Renderizados como filhos do wrapper transformado (acompanham o
 *     pan/zoom sem cálculo). O `TokenPin` cuida do drag com authz.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, IconButton, Slider, Stack, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import { useMapZoomPan, MAX_ZOOM, MIN_ZOOM } from './useMapZoomPan';
import { useMapStore } from '@/stores/map.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useSocketContext } from '@/contexts/SocketContext';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { usePersistedMapView } from '@/hooks/usePersistedMapView';
import { useAuth } from '@/hooks/useAuth';
import { useRoom } from '@/hooks/useRoom';
import { TokenPin } from './TokenPin';
import type { RoomMap } from '@/types';

export interface MapCanvasProps {
  map: RoomMap | null;
}

interface DragState {
  startX: number;
  startY: number;
  startViewX: number;
  startViewY: number;
}

export function MapCanvas({ map }: MapCanvasProps) {
  const { zoom, setZoom, reset, setPan, x, y } = useMapZoomPan();
  const activeId = useMapStore((s) => s.active?.id ?? null);
  const { socket } = useSocketContext();
  const { room } = useRoom();
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);

  // Persiste a viewport do (roomCode, activeMapId) em localStorage.
  usePersistedMapView(room?.code ?? '', activeId);

  // Tokens do mapa ativo (filtra por mapId).
  const allTokens = useTokensStore((s) => s.tokens);
  const tokensForActiveMap = useMemo(
    () => (map ? allTokens.filter((t) => t.mapId === map.id) : []),
    [allTokens, map],
  );

  // Broadcast debounced da viewport para os outros membros.
  const broadcast = useDebouncedCallback(
    (nextX: number, nextY: number, nextZoom: number) => {
      if (!map || map.id !== activeId) return;
      socket.emit('map:state', { mapId: map.id, x: nextX, y: nextY, zoom: nextZoom });
    },
    80,
  );

  useEffect(() => {
    broadcast(x, y, zoom);
  }, [x, y, zoom, broadcast]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!map) return;
      // Se o target é um TokenPin, ele já chamou stopPropagation.
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startViewX: x,
        startViewY: y,
      };
      setIsPanning(true);
    },
    [map, x, y],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const ds = dragRef.current;
      if (!ds) return;
      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;
      setPan(ds.startViewX + dx, ds.startViewY + dy);
    },
    [setPan],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (containerRef.current?.hasPointerCapture(e.pointerId)) {
      containerRef.current.releasePointerCapture(e.pointerId);
    }
    dragRef.current = null;
    setIsPanning(false);
  }, []);

  // Wheel zoom (desktop)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const onWheel = (e: WheelEvent): void => {
      if (!map) return;
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      setZoom(zoom * factor);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [map, zoom, setZoom]);

  if (!map) {
    return (
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          minHeight: 0,
          bgcolor: 'background.paper',
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.disabled',
        }}
      >
        <Stack alignItems="center" spacing={1}>
          <OpenWithIcon sx={{ fontSize: 48 }} />
          <Box sx={{ fontSize: 14 }}>Sem mapa ativo</Box>
        </Stack>
      </Box>
    );
  }

  // Quem é o viewer? Usamos para resolver permissão de token: mestre pode
  // mover qualquer token; jogador só pode mover o próprio.
  const viewerIsMaster = user?.id === room?.masterId;

  return (
    <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
      <Box
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        sx={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          cursor: isPanning ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 120ms ease-out',
            willChange: 'transform',
          }}
        >
          <Box
            component="img"
            src={map.imageUrl}
            alt={map.name}
            draggable={false}
            sx={{
              display: 'block',
              maxWidth: '90vw',
              maxHeight: '90vh',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
          {tokensForActiveMap.map((t) => {
            const canMove = viewerIsMaster || (user !== null && t.controllerUserId === user.id);
            return <TokenPin key={t.id} token={t} canMove={canMove} />;
          })}
        </Box>
      </Box>

      {/* Controles de zoom (canto inferior direito) */}
      <Stack
        spacing={0.5}
        sx={{
          position: 'absolute',
          right: 8,
          bottom: 8,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          p: 0.5,
          boxShadow: 1,
        }}
      >
        <Tooltip title="Aproximar" placement="left">
          <IconButton size="small" onClick={() => setZoom(zoom + 0.2)} aria-label="Aproximar">
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Afastar" placement="left">
          <IconButton size="small" onClick={() => setZoom(zoom - 0.2)} aria-label="Afastar">
            <RemoveIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Box sx={{ px: 1, py: 0.5, width: 100 }}>
          <Slider
            size="small"
            value={zoom}
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.1}
            onChange={(_, v) => setZoom(typeof v === 'number' ? v : (v[0] ?? 1))}
            aria-label="Zoom"
          />
        </Box>
        <Tooltip title="Resetar" placement="left">
          <IconButton size="small" onClick={reset} aria-label="Resetar mapa">
            <RestartAltIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}
