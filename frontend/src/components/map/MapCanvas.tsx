/**
 * MapCanvas — área do mapa com pan/zoom.
 *
 * Stub visual: mostra a imagem (ou placeholder), aplica transform
 * CSS baseada em x/y/zoom. Gestos de pinch-zoom e pan chegam na
 * fase 5; aqui só temos os controles de UI (botões de zoom,
 * slider) que mexem no mesmo estado.
 */
import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Slider, Stack, Tooltip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import { useMapZoomPan, MAX_ZOOM, MIN_ZOOM } from './useMapZoomPan';
import type { RoomMap } from '@/types';

export interface MapCanvasProps {
  map: RoomMap | null;
}

export function MapCanvas({ map }: MapCanvasProps) {
  const { zoom, setZoom, reset } = useMapZoomPan();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  return (
    <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
      <Box
        ref={containerRef}
        sx={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          // "Pegar" cursor para indicar que dá pra arrastar.
          cursor: 'grab',
          touchAction: 'none',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            component="img"
            src={map.imageUrl}
            alt={map.name}
            sx={{
              maxWidth: '100%',
              maxHeight: '100%',
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 120ms ease-out',
              userSelect: 'none',
              pointerEvents: 'none',
              // Em mobile o tamanho mínimo garante que dá pra ver.
              minWidth: size.w ? Math.min(size.w, 600) : 'auto',
              minHeight: size.h ? Math.min(size.h, 600) : 'auto',
            }}
          />
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
