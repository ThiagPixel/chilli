/**
 * DiceRoller — botões rápidos + expressão custom + histórico.
 *
 * Layout mobile-first (390px):
 *   ┌──────────────────────────────────┐
 *   │  Quick dice (7 botões)           │
 *   │  ┌─[d4] [d6] [d8] [d10] [d12]   │
 *   │  [d20]  [d100]                  │
 *   ├──────────────────────────────────┤
 *   │  Expressão custom: [____] [Rolar]│
 *   ├──────────────────────────────────┤
 *   │  Histórico (rolls, mais novo 1º) │
 *   │  <RollResult />                  │
 *   │  <RollResult />                  │
 *   └──────────────────────────────────┘
 *
 * Stub: as ações disparam toast "em breve" — a rolagem real
 * passa pelo `useDice.roll()` (no-op) e o resultado vai entrar
 * no store via `dice:result` na fase 5.
 */
import { useState, type FormEvent } from 'react';
import { Box, Button, Divider, Stack, TextField, Typography } from '@mui/material';
import { useDice } from '@/hooks/useDice';
import { useToast } from '@/hooks/useToast';
import { usePlayersStore } from '@/stores/players.store';
import { parseSimpleExpression } from './diceParser';
import { ALL_DICE, DiceButton, type DiceSides } from './DiceButton';
import { RollResult } from './RollResult';
import { EmptyState } from '@/components/ui';
import CasinoIcon from '@mui/icons-material/Casino';

export interface DiceRollerProps {
  roomCode: string;
}

export function DiceRoller({ roomCode: _roomCode }: DiceRollerProps) {
  const { rolls, roll } = useDice();
  const toast = useToast();
  const members = usePlayersStore((s) => s.members);
  const [expression, setExpression] = useState<string>('');

  const parsed = parseSimpleExpression(expression);
  const isExpressionValid = parsed !== null;

  const handleQuickRoll = (sides: DiceSides) => {
    void roll(`1d${sides}`);
    toast.info(`Rolagem de d${sides} chega na próxima fase.`);
  };

  const handleExpressionRoll = (e?: FormEvent) => {
    e?.preventDefault();
    if (!isExpressionValid) {
      toast.error('Expressão inválida. Tente algo como 2d6+3.');
      return;
    }
    void roll(expression.trim());
    toast.info(`Rolagem de ${expression} chega na próxima fase.`);
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

      <Divider flexItem />

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

      <Divider flexItem />

      {/* Histórico */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <Typography variant="overline" color="text.secondary">
          Histórico
        </Typography>
        {rolls.length === 0 ? (
          <EmptyState
            icon={<CasinoIcon fontSize="inherit" />}
            title="Nenhuma rolagem ainda"
            description="As rolagens da mesa aparecerão aqui em tempo real."
          />
        ) : (
          <Stack spacing={1} sx={{ mt: 1 }}>
            {rolls.map((r) => {
              const author = members.find((m) => m.user.id === r.userId)?.user;
              return <RollResult key={r.id} roll={r} {...(author ? { author } : {})} />;
            })}
          </Stack>
        )}
      </Box>
    </Stack>
  );
}
