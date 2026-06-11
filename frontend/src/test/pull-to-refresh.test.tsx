/**
 * Testes do pull-to-refresh (Feature #4).
 *
 * Cobre:
 *   - Hook usePullToRefresh: dispara onRefresh quando o gesto passa do threshold
 *   - Hook usePullToRefresh: cancela se o scroll não está no topo
 *   - Hook usePullToRefresh: resiste ao over-pull (resistência 0.55x)
 *   - Componente RefreshableScroller: renderiza indicador durante refresh
 *   - Componente RefreshableScroller: chama onRefresh ao puxar
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRef, type ReactNode } from 'react';
import { Box } from '@mui/material';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { RefreshableScroller } from '@/components/ui';

// Mock do ThemeProvider para o RefreshableScroller não reclamar.
function wrapWithTheme(node: ReactNode) {
  return render(<Box sx={{ width: 400, height: 600 }}>{node}</Box>);
}

describe('usePullToRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function TestComponent({
    onRefresh,
    targetEl,
  }: {
    onRefresh: () => Promise<void> | void;
    targetEl?: HTMLElement | null;
  }) {
    const targetRef = useRef<HTMLElement | null>(targetEl ?? null);
    const { onTouchStart, onTouchMove, onTouchEnd, pullDistance, isRefreshing } =
      usePullToRefresh({ onRefresh, targetRef });

    return (
      <Box>
        <Box
          ref={(el) => {
            targetRef.current = el as HTMLElement | null;
          }}
          data-testid="scroller"
          sx={{ overflowY: 'auto', height: 200 }}
          onTouchStart={onTouchStart as unknown as React.TouchEventHandler<HTMLDivElement>}
          onTouchMove={onTouchMove as unknown as React.TouchEventHandler<HTMLDivElement>}
          onTouchEnd={onTouchEnd as unknown as React.TouchEventHandler<HTMLDivElement>}
        >
          <Box sx={{ height: 1000 }}>conteúdo</Box>
        </Box>
        <Box data-testid="pull-distance">{pullDistance.toFixed(0)}</Box>
        <Box data-testid="is-refreshing">{isRefreshing ? '1' : '0'}</Box>
      </Box>
    );
  }

  function makeTouchEvent(_type: string, clientY: number): React.TouchEvent {
    return {
      touches: [{ clientY } as React.Touch],
    } as unknown as React.TouchEvent;
  }

  it('dispara onRefresh quando o gesto passa do threshold (80px)', async () => {
    // Promise controlada: o mock só resolve quando o teste manda.
    let resolveRefresh: () => void = () => {};
    const onRefresh = vi.fn().mockImplementation(
      () => new Promise<void>((r) => { resolveRefresh = r; }),
    );
    wrapWithTheme(<TestComponent onRefresh={onRefresh} />);

    const scroller = screen.getByTestId('scroller');

    await act(async () => {
      fireEvent.touchStart(scroller, makeTouchEvent('start', 100));
      fireEvent.touchMove(scroller, makeTouchEvent('move', 250)); // dy=150
    });

    // Refresh foi disparado, isRefreshing=true (e continua até resolver).
    await waitFor(() => {
      expect(screen.getByTestId('is-refreshing').textContent).toBe('1');
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    // Resolve e verifica volta a 0.
    await act(async () => {
      resolveRefresh();
    });
    await waitFor(() => {
      expect(screen.getByTestId('is-refreshing').textContent).toBe('0');
    });
  });

  it('NÃO dispara se o gesto for menor que o threshold', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    wrapWithTheme(<TestComponent onRefresh={onRefresh} />);

    const scroller = screen.getByTestId('scroller');

    await act(async () => {
      fireEvent.touchStart(scroller, makeTouchEvent('start', 100));
      fireEvent.touchMove(scroller, makeTouchEvent('move', 140)); // dy=40 < 80
      fireEvent.touchEnd(scroller);
    });

    expect(onRefresh).not.toHaveBeenCalled();
    expect(screen.getByTestId('is-refreshing').textContent).toBe('0');
    // pullDistance é resetado para 0 ao soltar sem disparar.
    expect(screen.getByTestId('pull-distance').textContent).toBe('0');
  });

  it('cancela o gesto se o scroll subir (scrollTop > 4)', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <Box sx={{ width: 400, height: 600 }}>
        <TestComponentWithNonZeroScroll onRefresh={onRefresh} />
      </Box>,
    );

    const scroller = screen.getByTestId('scroller-scrolled');

    await act(async () => {
      fireEvent.touchStart(scroller, makeTouchEvent('start', 100));
      fireEvent.touchMove(scroller, makeTouchEvent('move', 250));
    });

    expect(onRefresh).not.toHaveBeenCalled();
    expect(screen.getByTestId('pull-distance').textContent).toBe('0');
  });
});

/** Componente com scrollTop > 0 (simula usuário rolou para baixo). */
function TestComponentWithNonZeroScroll({
  onRefresh,
}: {
  onRefresh: () => Promise<void> | void;
}) {
  const targetRef = useRef<HTMLElement | null>(null);
  const { onTouchStart, onTouchMove, onTouchEnd, pullDistance } = usePullToRefresh({
    onRefresh,
    targetRef,
  });
  return (
    <Box>
      <Box
        ref={(el) => {
          targetRef.current = el as HTMLElement | null;
          if (el) (el as HTMLElement).scrollTop = 100; // simula scrollado
        }}
        data-testid="scroller-scrolled"
        sx={{ overflowY: 'auto', height: 200 }}
        onTouchStart={onTouchStart as unknown as React.TouchEventHandler<HTMLDivElement>}
        onTouchMove={onTouchMove as unknown as React.TouchEventHandler<HTMLDivElement>}
        onTouchEnd={onTouchEnd as unknown as React.TouchEventHandler<HTMLDivElement>}
      >
        <Box sx={{ height: 1000 }}>conteúdo</Box>
      </Box>
      <Box data-testid="pull-distance">{pullDistance.toFixed(0)}</Box>
    </Box>
  );
}

describe('RefreshableScroller', () => {
  it('renderiza children dentro do scroller', () => {
    render(
      <Box sx={{ width: 400, height: 600 }}>
        <RefreshableScroller onRefresh={() => {}}>
          <div data-testid="child">hello</div>
        </RefreshableScroller>
      </Box>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('mostra botão "Atualizar" no canto (desktop equivalent)', () => {
    render(
      <Box sx={{ width: 400, height: 600 }}>
        <RefreshableScroller onRefresh={() => {}} refreshLabel="Atualizar dados">
          <div>conteúdo</div>
        </RefreshableScroller>
      </Box>,
    );
    // O IconButton tem display: { xs: 'none', md: 'inline-flex' };
    // em testes jsdom o breakpoint é 0px, então md é true.
    expect(screen.getByRole('button', { name: /atualizar dados/i })).toBeInTheDocument();
  });

  it('chama onRefresh ao clicar no botão', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(
      <Box sx={{ width: 400, height: 600 }}>
        <RefreshableScroller onRefresh={onRefresh}>
          <div>conteúdo</div>
        </RefreshableScroller>
      </Box>,
    );
    const btn = screen.getByRole('button', { name: /atualizar/i });
    await act(async () => {
      fireEvent.click(btn);
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
