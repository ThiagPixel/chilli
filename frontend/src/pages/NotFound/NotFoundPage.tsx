/** Página 404 — placeholder. */
import { Button, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/routes/paths';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Stack spacing={2} sx={{ alignItems: 'center', pt: 6, textAlign: 'center' }}>
      <Typography variant="h1" color="primary">404</Typography>
      <Typography variant="h4">Página não encontrada</Typography>
      <Button variant="contained" onClick={() => navigate(PATHS.home)}>
        Voltar ao início
      </Button>
    </Stack>
  );
}
