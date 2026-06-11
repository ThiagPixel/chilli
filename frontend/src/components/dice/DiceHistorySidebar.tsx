/**
 * DiceHistorySidebar — sidebar persistente do histórico no desktop.
 *
 * Renderizado à direita do PlayerList no RoomPage (desktop only).
 * Mantém aceso mesmo quando o usuário troca de aba no mobile
 * (mas em mobile ele não é renderizado — o DiceHistoryFab cuida).
 */
import { Box, Stack } from '@mui/material';
import { DiceHistoryPanel } from './DiceHistoryPanel';

export interface DiceHistorySidebarProps {
  /** Largura fixa (px). Padrão 320. */
  width?: number;
}

export function DiceHistorySidebar({ width = 320 }: DiceHistorySidebarProps) {
  return (
    <Box
      sx={{
        width,
        flexShrink: 0,
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        minHeight: 0,
        borderLeft: { md: '1px solid' },
        borderColor: { md: 'divider' },
        pl: { md: 2 },
      }}
    >
      <Stack sx={{ flex: 1, minHeight: 0 }} spacing={1.5}>
        <DiceHistoryPanel showTitle />
      </Stack>
    </Box>
  );
}
