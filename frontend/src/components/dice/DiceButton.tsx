/**
 * DiceButton — botão rápido para um dado (d4, d6, d8, d10, d12, d20, d100).
 *
 * Visual: polígono sugerido pela cor do dado, com o valor `dN` grande.
 * Os sete dados oficiais do MVP são listados em `SIDES`.
 */
import { Box, Button, type ButtonProps } from '@mui/material';

export type DiceSides = 4 | 6 | 8 | 10 | 12 | 20 | 100;

export interface DiceButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  sides: DiceSides;
  onClick?: () => void;
}

const COLORS: Record<DiceSides, string> = {
  4: '#2e7d32', // verde
  6: '#1565c0', // azul
  8: '#6a1b9a', // roxo
  10: '#ef6c00', // laranja
  12: '#c62828', // vermelho chilli
  20: '#37474f', // preto
  100: '#5d4037', // marrom
};

export function DiceButton({ sides, onClick, sx, ...rest }: DiceButtonProps) {
  const color = COLORS[sides];
  return (
    <Button
      variant="contained"
      onClick={onClick}
      sx={{
        minWidth: 64,
        minHeight: 64,
        bgcolor: color,
        color: '#fff',
        flexDirection: 'column',
        borderRadius: 2,
        py: 1,
        '&:hover': { bgcolor: color, filter: 'brightness(0.95)' },
        ...sx,
      }}
      {...rest}
    >
      <Box component="span" sx={{ fontSize: '1.5rem', fontWeight: 800, lineHeight: 1 }}>
        d{sides}
      </Box>
    </Button>
  );
}

export const ALL_DICE: ReadonlyArray<DiceSides> = [4, 6, 8, 10, 12, 20, 100];
