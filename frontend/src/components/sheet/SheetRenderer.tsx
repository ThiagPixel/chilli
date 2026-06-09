/**
 * SheetRenderer — visualização de uma ficha (Character).
 *
 * O MVP define a ficha como "estrutura JSON flexível" (ARCHITECTURE).
 * O renderer mostra os campos do JSON agrupados por profundidade:
 *   - Strings/booleans/numbers → chips coloridos.
 *   - Arrays → lista de strings (união por vírgula).
 *   - Objects → cartões aninhados.
 *
 * Não tenta adivinhar sistema (D&D, Tormenta, etc) — só expõe o JSON.
 */
import { Box, Card, Chip, Stack, Typography } from '@mui/material';
import type { Character } from '@/types';

export interface SheetRendererProps {
  character: Character;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function RenderValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) {
    return <Chip label="—" size="small" variant="outlined" />;
  }
  if (typeof value === 'boolean') {
    return (
      <Chip
        label={value ? 'sim' : 'não'}
        size="small"
        color={value ? 'success' : 'default'}
        variant="outlined"
      />
    );
  }
  if (typeof value === 'number') {
    return <Chip label={String(value)} size="small" color="primary" variant="outlined" />;
  }
  if (typeof value === 'string') {
    return <Chip label={value} size="small" variant="outlined" sx={{ height: 'auto', whiteSpace: 'normal' }} />;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <Chip label="(vazio)" size="small" variant="outlined" />;
    const allString = value.every((v) => typeof v === 'string' || typeof v === 'number');
    if (allString) {
      return (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
          {value.map((v, i) => (
            <Chip key={i} label={String(v)} size="small" variant="outlined" />
          ))}
        </Stack>
      );
    }
    return (
      <Stack spacing={0.5} sx={{ pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
        {value.map((v, i) => (
          <Box key={i}>
            <RenderValue value={v} />
          </Box>
        ))}
      </Stack>
    );
  }
  if (isObject(value)) {
    return <RenderObject data={value} />;
  }
  return <Chip label={String(value)} size="small" />;
}

function RenderObject({ data }: { data: Record<string, unknown> }) {
  return (
    <Stack spacing={0.75} sx={{ pl: 1, borderLeft: '2px solid', borderColor: 'divider' }}>
      {Object.entries(data).map(([k, v]) => (
        <Box key={k}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            {k}
          </Typography>
          <Box sx={{ mt: 0.25 }}>
            <RenderValue value={v} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

export function SheetRenderer({ character }: SheetRendererProps) {
  return (
    <Card sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Ficha
          </Typography>
          <Typography variant="h3">{character.name}</Typography>
        </Box>
        <RenderObject data={character.data} />
      </Stack>
    </Card>
  );
}
