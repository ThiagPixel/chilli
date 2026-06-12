/**
 * DiceHistoryPanel — header (filtro, clear, contagem) + lista.
 *
 * Usado tanto pelo sidebar desktop quanto pelo Drawer mobile.
 * Mantém o estado do filtro "só minhas" no localStorage para
 * persistir entre reloads.
 */
import { useEffect, useState } from 'react';
import { Box, Stack, Switch, FormControlLabel, Typography, Tooltip, IconButton, Divider } from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useDiceStore } from '@/stores/dice.store';
import { DiceHistoryList } from './DiceHistoryList';

const FILTER_STORAGE_KEY = 'chilli:dice:onlyMine';

function readStoredFilter(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(FILTER_STORAGE_KEY) === '1';
}

function writeStoredFilter(value: boolean): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(FILTER_STORAGE_KEY, value ? '1' : '0');
}

export interface DiceHistoryPanelProps {
  /** Quando true, o header inclui o título "Histórico" (sidebar desktop). */
  showTitle?: boolean;
  /** Densidade (Drawer mobile usa true para caber mais). */
  dense?: boolean;
}

export function DiceHistoryPanel({ showTitle = true, dense = false }: DiceHistoryPanelProps) {
  const [onlyMine, setOnlyMine] = useState<boolean>(() => readStoredFilter());
  const [count, setCount] = useState<number>(0);
  const clearAll = useDiceStore((s) => s.clear);

  useEffect(() => {
    writeStoredFilter(onlyMine);
  }, [onlyMine]);

  return (
    <Stack sx={{ flex: 1, minHeight: 0 }} spacing={dense ? 0.5 : 1.5}>
      {showTitle ? (
        <Box sx={{ px: dense ? 1 : 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
            sx={{ minHeight: 32 }}
          >
            <Typography variant="overline" color="text.secondary">
              Histórico {count > 0 ? `(${count})` : ''}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Tooltip title="Limpar visualização local (não apaga do servidor)">
                <span>
                  <IconButton
                    size="small"
                    onClick={clearAll}
                    disabled={count === 0}
                    aria-label="Limpar histórico local"
                  >
                    <DeleteSweepIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>

          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={onlyMine}
                onChange={(e) => setOnlyMine(e.target.checked)}
                inputProps={{ 'aria-label': 'Mostrar só minhas rolagens' }}
              />
            }
            label={
              <Typography variant="caption" color="text.secondary">
                Só minhas
              </Typography>
            }
            sx={{ ml: 0, mt: 0.5 }}
          />
        </Box>
      ) : null}

      {!showTitle ? (
        <Box sx={{ px: dense ? 1 : 0 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
          >
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={onlyMine}
                  onChange={(e) => setOnlyMine(e.target.checked)}
                  inputProps={{ 'aria-label': 'Mostrar só minhas rolagens' }}
                />
              }
              label={
                <Typography variant="caption" color="text.secondary">
                  Só minhas{count > 0 ? ` · ${count}` : ''}
                </Typography>
              }
              sx={{ ml: 0 }}
            />
            <Tooltip title="Limpar visualização local">
              <span>
                <IconButton
                  size="small"
                  onClick={clearAll}
                  disabled={count === 0}
                  aria-label="Limpar histórico local"
                >
                  <DeleteSweepIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Box>
      ) : null}

      {showTitle ? <Divider /> : null}

      <DiceHistoryList
        onlyMine={onlyMine}
        onCountChange={setCount}
        dense={dense}
        emptyState={{
          title: onlyMine ? 'Nenhuma rolagem sua' : 'Nenhuma rolagem ainda',
          description: onlyMine
            ? 'Role um dado para ele aparecer aqui.'
            : 'As rolagens da mesa aparecerão aqui em tempo real.',
        }}
      />
    </Stack>
  );
}
