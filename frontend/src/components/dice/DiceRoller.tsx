/**
 * DiceRoller — botões rápidos + expressão custom.
 *
 * O histórico de rolagens vive em `DiceHistoryPanel` (acessível
 * via FAB mobile ou sidebar persistente no desktop) — não
 * duplicamos a lista aqui. A aba "Dados" é só para ROLAR.
 *
 * Layout mobile-first (390px):
 *   ┌──────────────────────────────────┐
 *   │  Quick dice (7 botões)           │
 *   │  ┌─[d4] [d6] [d8] [d10] [d12]   │
 *   │  [d20]  [d100]                  │
 *   ├──────────────────────────────────┤
 *   │  Expressão custom: [____] [Rolar]│
 *   ├──────────────────────────────────┤
 *   │  Atalho: histórico (link/botão)  │
 *   └──────────────────────────────────┘
 *
 * Quick roll e expressão custom chamam `useDice().roll()`, que emite
 * `dice:roll` no socket. O resultado volta via `dice:result` e entra
 * no store. O broadcast para os outros membros é o mesmo evento.
 */
import { useState, type FormEvent } from 'react';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useDice } from '@/hooks/useDice';
import { useToast } from '@/hooks/useToast';
import { parseSimpleExpression } from './diceParser';
import { ALL_DICE, DiceButton, type DiceSides } from './DiceButton';
import CasinoIcon from '@mui/icons-material/Casino';

export interface DiceRollerProps {
  roomCode: string;
}

export function DiceRoller({ roomCode: _roomCode }: DiceRollerProps) {
  const { rolls, roll } = useDice();
  const toast = useToast();
  const [expression, setExpression] = useState<string>('');

  const parsed = parseSimpleExpression(expression);
  const isExpressionValid = parsed !== null;

  const handleQuickRoll = (sides: DiceSides): void => {
    void roll(`1d${sides}`);
  };

  const handleExpressionRoll = (e?: FormEvent): void => {
    e?.preventDefault();
    if (!isExpressionValid) {
      toast.error('Expressão inválida. Tente algo como 2d6+3.');
      return;
    }
    void roll(expression.trim());
  };

  return (
    <Stack sx={{ flex: 1, minHeight: 0 }} spacing={2}>
      {/* Quick dice */}
      <Box>
        <Typography variant="overline" color="text.secondary">
          Rolagem rápida
        </Typography>
        <Box
          sx={{
            mt: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 1,
          }}
        >
          {ALL_DICE.map((s) => (
            <DiceButton
              key={s}
              sides={s}
              onClick={() => handleQuickRoll(s)}
              aria-label={`Rolar d${s}`}
            />
          ))}
        </Box>
      </Box>

      {/* Custom expression */}
      <Box component="form" onSubmit={handleExpressionRoll}>
        <Typography variant="overline" color="text.secondary">
          Expressão custom
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 1 }}>
          <TextField
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="2d6+3"
            size="small"
            error={expression.length > 0 && !isExpressionValid}
            helperText={
              expression.length > 0 && !isExpressionValid
                ? 'Use NdM (ex.: 2d6) com modificador opcional +/-K'
                : ' '
            }
            inputProps={{ 'aria-label': 'Expressão de dado' }}
            sx={{ fontFamily: 'monospace' }}
          />
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            disabled={!isExpressionValid}
            startIcon={<CasinoIcon />}
            sx={{ minHeight: 44 }}
          >
            Rolar
          </Button>
        </Stack>
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary">
          {rolls.length === 0
            ? 'Suas rolagens aparecerão no histórico da mesa (FAB no mobile ou sidebar no desktop).'
            : `${rolls.length} ${rolls.length === 1 ? 'rolagem' : 'rolagens'} no histórico da mesa.`}
        </Typography>
      </Box>
    </Stack>
  );
}
