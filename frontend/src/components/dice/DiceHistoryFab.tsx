/**
 * DiceHistoryFab — FAB mobile + Drawer que abre o histórico.
 *
 * Visível só no mobile (xs). Em desktop o histórico já fica
 * num sidebar persistente (DiceHistorySidebar).
 *
 * O Drawer é `anchor="bottom"` com altura limitada para
 * deixar a sala visível no fundo (UX mobile-first).
 */
import { useState } from 'react';
import { Box, Drawer, Fab, Stack, Typography, IconButton, useMediaQuery } from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import CloseIcon from '@mui/icons-material/Close';
import { useDice } from '@/hooks/useDice';
import { DiceHistoryPanel } from './DiceHistoryPanel';

export function DiceHistoryFab() {
  const [open, setOpen] = useState<boolean>(false);
  const { rolls } = useDice();
  // Só renderiza em mobile/tablet. Em desktop o sidebar cuida.
  const isDesktop = useMediaQuery((t) => t.breakpoints.up('md'));
  if (isDesktop) return null;

  return (
    <>
      <Fab
        color="primary"
        size="medium"
        onClick={() => setOpen(true)}
        aria-label="Abrir histórico de rolagens"
        sx={{
          position: 'fixed',
          // Acima do BottomNav (que tem 56px) + margem.
          right: 16,
          bottom: 72,
          zIndex: (t) => t.zIndex.appBar + 1,
        }}
      >
        <Stack alignItems="center" justifyContent="center">
          <CasinoIcon fontSize="small" />
          {rolls.length > 0 ? (
            <Typography
              variant="caption"
              sx={{ fontSize: 10, lineHeight: 1, mt: 0.25, fontWeight: 700 }}
            >
              {rolls.length > 99 ? '99+' : rolls.length}
            </Typography>
          ) : null}
        </Stack>
      </Fab>

      <Drawer
        anchor="bottom"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            height: { xs: '70vh', sm: '60vh' },
            maxHeight: 600,
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            display: 'flex',
            flexDirection: 'column',
          },
        }}
        ModalProps={{ keepMounted: true }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 1, py: 0.5, borderBottom: 1, borderColor: 'divider' }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <CasinoIcon color="primary" fontSize="small" />
            <Typography variant="subtitle1">Histórico de rolagens</Typography>
          </Stack>
          <IconButton onClick={() => setOpen(false)} aria-label="Fechar histórico">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <DiceHistoryPanel showTitle={false} dense />
        </Box>
      </Drawer>
    </>
  );
}
