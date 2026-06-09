/**
 * Home — landing page.
 *
 * Objetivo do produto: "criar mesa em menos de 30 segundos".
 * O ponto de entrada tem que ser único e óbvio: "Criar mesa".
 *
 * Layout mobile-first (390px):
 *   - Hero (logo + tagline)
 *   - Botão primário gigante: "Criar mesa"
 *   - Botão secundário: "Entrar com código"
 *   - (futuro) — atalhos: "Mesa recente", "Continuar como <nome>".
 */
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import AddIcon from '@mui/icons-material/AddCircle';
import LoginIcon from '@mui/icons-material/Login';
import { PATHS } from '@/routes/paths';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="xs" disableGutters>
      <Stack
        spacing={4}
        sx={{
          alignItems: 'stretch',
          justifyContent: 'center',
          minHeight: 'calc(100dvh - 56px - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
          py: 4,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography
            variant="h1"
            color="primary"
            sx={{ fontSize: { xs: '2.75rem', sm: '3.25rem' }, letterSpacing: -1 }}
          >
            Chilli
          </Typography>
          <Typography variant="h4" color="text.secondary" sx={{ mt: 1, fontWeight: 500 }}>
            O WhatsApp dos RPGs
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mt: 2 }}>
            Crie uma mesa em menos de 30 segundos.
          </Typography>
        </Box>

        <Stack spacing={1.5}>
          <Button
            size="large"
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate(PATHS.createRoom)}
          >
            Criar mesa
          </Button>
          <Button
            size="large"
            variant="outlined"
            color="primary"
            startIcon={<LoginIcon />}
            onClick={() => navigate(PATHS.joinRoom)}
          >
            Entrar com código
          </Button>
        </Stack>

        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ textAlign: 'center', mt: 4 }}
        >
          Funciona em qualquer celular. Sem instalação.
        </Typography>
      </Stack>
    </Container>
  );
}
