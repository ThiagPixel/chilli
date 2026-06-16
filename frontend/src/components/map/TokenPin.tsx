/**
 * TokenPin — bolinha colorida com 1-3 letras no centro.
 *
 * Renderizado como filho do wrapper transformado do `MapCanvas`
 * (que já aplica pan/zoom da imagem), então tokens acompanham
 * o mapa sem cálculo extra. A posição interna (x, y em image-space)
 * é aplicada via `transform: translate(x, y)` — alinhada pelo centro
 * (`translate(-50%, -50%)` no estilo).
 *
 * Drag:
 *   - `onPointerDown` chama `e.stopPropagation()` para não iniciar
 *     o pan do canvas.
 *   - `setPointerCapture` permite continuar recebendo eventos
 *     mesmo se o cursor sair do pin.
 *   - `onPointerMove` calcula o delta em pixels da TELA, divide
 *     pelo zoom atual (para manter a posição em image-space estável)
 *     e atualiza otimista o store + emite `token:move` debounced.
 *   - `onPointerUp` faz flush final (sem debounce) para a posição não
 *     ficar "presa" atrás do último debounce.
 *
 * Permissão (`canMove`) é resolvida no parent (MapCanvas) e passada
 * via prop — este componente não conhece o role do usuário.
 */
import { useCallback, useRef } from 'react';
import { Box } from '@mui/material';
import { useMapStore } from '@/stores/map.store';
import { useTokensStore } from '@/stores/tokens.store';
import { useSocketContext } from '@/contexts/SocketContext';
import { useToast } from '@/hooks/useToast';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import type { MapToken } from '@/types';

export interface TokenPinProps {
  token: MapToken;
  /** O parent já calculou se o viewer pode mover este token. */
  canMove: boolean;
}

interface DragState {
  startClientX: number;
  startClientY: number;
  startTokenX: number;
  startTokenY: number;
}

export function TokenPin({ token, canMove }: TokenPinProps) {
  const { socket } = useSocketContext();
  const toast = useToast();
  const zoom = useMapStore((s) => s.view.zoom);
  const dragRef = useRef<DragState | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);

  const broadcast = useDebouncedCallback(
    (nextX: number, nextY: number) => {
      socket.emit('token:move', { tokenId: token.id, x: nextX, y: nextY });
    },
    80,
  );

  // Flush final no pointerUp (sem debounce) — garante que o último
  // pixel é entregue, evitando posição "presa" atrás do debounce.
  const flushFinal = useCallback(
    (nextX: number, nextY: number) => {
      socket.emit('token:move', { tokenId: token.id, x: nextX, y: nextY });
    },
    [socket, token.id],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!canMove) {
        e.stopPropagation();
        toast.warning('Você não pode mover esse token.');
        return;
      }
      e.stopPropagation();
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        startClientX: e.clientX,
        startClientY: e.clientY,
        startTokenX: token.x,
        startTokenY: token.y,
      };
    },
    [canMove, token.x, token.y, toast],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const ds = dragRef.current;
      if (!ds) return;
      e.stopPropagation();
      const dxScreen = e.clientX - ds.startClientX;
      const dyScreen = e.clientY - ds.startClientY;
      // Divide pelo zoom: posição em image-space permanece estável.
      const nextX = ds.startTokenX + dxScreen / zoom;
      const nextY = ds.startTokenY + dyScreen / zoom;
      // Update otimista.
      useTokensStore.getState().update(token.id, { x: nextX, y: nextY });
      broadcast(nextX, nextY);
    },
    [zoom, broadcast, token.id],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const ds = dragRef.current;
      if (pinRef.current?.hasPointerCapture(e.pointerId)) {
        pinRef.current.releasePointerCapture(e.pointerId);
      }
      if (ds) {
        e.stopPropagation();
        const dxScreen = e.clientX - ds.startClientX;
        const dyScreen = e.clientY - ds.startClientY;
        const nextX = ds.startTokenX + dxScreen / zoom;
        const nextY = ds.startTokenY + dyScreen / zoom;
        flushFinal(nextX, nextY);
      }
      dragRef.current = null;
    },
    [zoom, flushFinal],
  );

  return (
    <Box
      ref={pinRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      sx={{
        position: 'absolute',
        left: 0,
        top: 0,
        // Centraliza pelo meio do pin (raio = 18px abaixo).
        transform: `translate(calc(${token.x}px - 50%), calc(${token.y}px - 50%))`,
        width: 36,
        height: 36,
        borderRadius: '50%',
        bgcolor: token.color,
        color: '#fff',
        fontWeight: 700,
        fontSize: 14,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid #fff',
        boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
        userSelect: 'none',
        cursor: canMove ? 'grab' : 'not-allowed',
        touchAction: 'none',
        textShadow: '0 1px 2px rgba(0,0,0,0.4)',
      }}
      role="img"
      aria-label={`Token ${token.label}`}
    >
      {token.label}
    </Box>
  );
}
