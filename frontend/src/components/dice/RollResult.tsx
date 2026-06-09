/**
 * RollResult — cartão de uma rolagem.
 *
 * Mostra:
 *   - Quem rolou + expressão (ex.: "Ana rolou 2d6+3").
 *   - O total (destaque).
 *   - As rolagens individuais como "pílulas" (com destaque
 *     para críticos/fumbles quando o dado é d20).
 */
import { Box, Chip, Stack, Typography } from '@mui/material';
import { formatChatTimestamp } from '@/utils';
import type { DiceRoll, User } from '@/types';

export interface RollResultProps {
  roll: DiceRoll;
  author?: User;
}

function isCritOrFumble(sides: number, value: number): 'crit' | 'fumble' | null {
  if (sides !== 20) return null;
  if (value === 20) return 'crit';
  if (value === 1) return 'fumble';
  return null;
}

export function RollResult({ roll, author }: RollResultProps) {
  // Heurística simples: o "sides" do dado é o maior valor do array.
  const sides = roll.rolls.reduce((m, v) => (v > m ? v : m), 0);

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        p: 1.5,
      }}
    >
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1}>
        <Typography variant="caption" color="text.secondary">
          {author ? `${author.name} rolou` : 'Rolagem'} {roll.expression}
        </Typography>
        <Typography variant="caption" color="text.disabled">
          {formatChatTimestamp(roll.createdAt)}
        </Typography>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mt: 0.5 }}>
        <Typography variant="h3" color="primary" sx={{ fontWeight: 800, lineHeight: 1 }}>
          {roll.total}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
          {roll.rolls.map((v, i) => {
            const tag = isCritOrFumble(sides, v);
            const color =
              tag === 'crit' ? 'success' : tag === 'fumble' ? 'error' : 'default';
            return (
              <Chip
                key={`${i}-${v}`}
                label={v}
                size="small"
                color={color}
                variant={tag ? 'filled' : 'outlined'}
                sx={{ fontWeight: 600 }}
              />
            );
          })}
          {roll.modifier !== 0 ? (
            <Chip
              label={`${roll.modifier > 0 ? '+' : ''}${roll.modifier}`}
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
          ) : null}
        </Stack>
      </Stack>
    </Box>
  );
}
