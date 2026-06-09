/**
 * JoinRoom — formulário para entrar em uma mesa existente.
 *
 * Fluxo:
 *  1. Pedir nome do jogador (e avatar opcional).
 *  2. Pedir código de 6 caracteres.
 *  3. Submit → `authService.anonymous` (se ainda não logado) +
 *     `roomService.join` → redireciona para `/r/<code>`.
 */
import { useState, type FormEvent } from 'react';
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  InputAdornment,
  Paper,
  Divider,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PersonIcon from '@mui/icons-material/Person';
import TagIcon from '@mui/icons-material/Tag';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import {
  CODE_LENGTH,
  CODE_PATTERN,
  NAME_MAX,
  isValidName,
  isValidRoomCode,
} from '@/utils';
import { roomService } from '@/services';
import { PATHS } from '@/routes/paths';

const AVATAR_PRESETS: ReadonlyArray<string> = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Aria&backgroundColor=c62828',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Bram&backgroundColor=ef6c00',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Cleo&backgroundColor=2e7d32',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Dax&backgroundColor=1565c0',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Eira&backgroundColor=6a1b9a',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Finn&backgroundColor=37474f',
];

export function JoinRoomPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, signIn, isLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code') ?? '';

  const [name, setName] = useState<string>(user?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [code, setCode] = useState<string>(codeFromUrl.toUpperCase());
  const [submitting, setSubmitting] = useState<boolean>(false);

  const trimmedName = name.trim();
  const trimmedCode = code.trim().toUpperCase();
  const codeValid = CODE_PATTERN.test(trimmedCode) || trimmedCode.length === 0;
  const codeComplete = trimmedCode.length >= CODE_LENGTH;
  const isValid = isValidName(trimmedName) && isValidRoomCode(trimmedCode);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      // 1. Garante que existe um usuário autenticado.
      if (!user) {
        await signIn(trimmedName, avatarUrl);
      }
      // 2. Entra na sala.
      const { room } = await roomService.join(trimmedCode);
      toast.success(`Entrou em ${room.code}`);
      navigate(PATHS.room(room.code));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao entrar na mesa.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack component="form" onSubmit={handleSubmit} spacing={3} sx={{ pt: 1 }}>
      <Box>
        <Typography variant="h2">Entrar em mesa</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Peça o código ao mestre. Ele tem 6 caracteres.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="overline" color="text.secondary">
            Seu personagem
          </Typography>

          <TextField
            label="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como os outros te verão"
            required
            inputProps={{ maxLength: NAME_MAX, 'aria-label': 'Seu nome' }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            helperText={
              trimmedName.length === 0
                ? 'Obrigatório'
                : isValidName(trimmedName)
                  ? `${trimmedName.length}/${NAME_MAX}`
                  : 'Nome inválido'
            }
            error={trimmedName.length > 0 && !isValidName(trimmedName)}
          />

          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Escolha um avatar
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Box
                onClick={() => setAvatarUrl(null)}
                role="button"
                tabIndex={0}
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  border: '2px solid',
                  borderColor: avatarUrl === null ? 'primary.main' : 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  bgcolor: 'action.hover',
                  color: 'text.disabled',
                }}
              >
                <PersonIcon fontSize="small" />
              </Box>
              {AVATAR_PRESETS.map((url) => (
                <Box
                  key={url}
                  onClick={() => setAvatarUrl(url)}
                  role="button"
                  tabIndex={0}
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: avatarUrl === url ? 'primary.main' : 'divider',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 100ms',
                    '&:hover': { transform: 'scale(1.05)' },
                  }}
                >
                  <Box component="img" src={url} alt="avatar preset" sx={{ width: '100%', height: '100%' }} />
                </Box>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Paper>

      <Divider>
        <Typography variant="caption" color="text.disabled">
          A MESA
        </Typography>
      </Divider>

      <TextField
        label="Código da mesa"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g, ''))}
        placeholder="K7H2F9"
        required
        inputProps={{
          maxLength: 8,
          'aria-label': 'Código da mesa',
          style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: 4, textTransform: 'uppercase' },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <TagIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
        helperText={
          !codeComplete
            ? `Faltam ${CODE_LENGTH - trimmedCode.length} caracteres (mínimo ${CODE_LENGTH})`
            : !codeValid
              ? 'Use apenas letras e números (sem 0, O, 1, I, L)'
              : 'Tudo certo'
        }
        error={!codeValid}
      />

      <Box>
        <Button
          type="submit"
          size="large"
          variant="contained"
          color="primary"
          startIcon={<LoginIcon />}
          endIcon={<ArrowForwardIcon />}
          disabled={!isValid || isLoading === true || submitting}
          fullWidth
        >
          {submitting ? 'Entrando…' : 'Entrar'}
        </Button>
      </Box>
    </Stack>
  );
}
