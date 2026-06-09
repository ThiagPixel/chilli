/**
 * CreateRoom — formulário para criar uma nova mesa.
 *
 * Fluxo:
 *  1. Pedir nome do mestre (e avatar opcional).
 *  2. Nome da mesa + descrição.
 *  3. Submit → `authService.anonymous` (se ainda não logado) +
 *     `roomService.create` → redireciona para `/r/<code>`.
 *
 * Stub: os handlers disparam um toast "em breve" e mantêm o
 * form preenchido. As chamadas reais entram na fase 5.
 */
import { useState, type FormEvent } from 'react';
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  InputAdornment,
  Tooltip,
  Paper,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/AddCircle';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PersonIcon from '@mui/icons-material/Person';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { isValidName, isValidRoomName, NAME_MAX, ROOM_NAME_MAX, ROOM_DESC_MAX } from '@/utils';
import { PATHS } from '@/routes/paths';

const AVATAR_PRESETS: ReadonlyArray<string> = [
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Aria&backgroundColor=c62828',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Bram&backgroundColor=ef6c00',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Cleo&backgroundColor=2e7d32',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Dax&backgroundColor=1565c0',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Eira&backgroundColor=6a1b9a',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Finn&backgroundColor=37474f',
];

export function CreateRoomPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, signIn, isLoading } = useAuth();

  const [masterName, setMasterName] = useState<string>(user?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [roomName, setRoomName] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  const trimmedName = masterName.trim();
  const trimmedRoom = roomName.trim();
  const isValid = isValidName(trimmedName) && isValidRoomName(trimmedRoom);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      toast.error('Preencha seu nome e o nome da mesa.');
      return;
    }

    try {
      // 1. Garante que existe um usuário autenticado.
      if (!user) {
        await signIn(trimmedName, avatarUrl);
      }
      // 2. Cria a sala (stub).
      //    await roomService.create({ name: trimmedRoom, description: description.trim() || null });
      // 3. Redireciona (stub: gera um código fake para a demo).
      const fakeCode = 'K7H2F9';
      toast.success('Sala criada!');
      navigate(PATHS.room(fakeCode));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao criar a mesa.';
      toast.error(msg);
    }
  };

  return (
    <Stack component="form" onSubmit={handleSubmit} spacing={3} sx={{ pt: 1 }}>
      <Box>
        <Typography variant="h2">Criar mesa</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Você é o mestre. Preencha seus dados e o nome da mesa.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="overline" color="text.secondary">
            Seu personagem
          </Typography>

          <TextField
            label="Seu nome"
            value={masterName}
            onChange={(e) => setMasterName(e.target.value)}
            placeholder="Como os jogadores te verão"
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
              <Tooltip title="Sem avatar">
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
                  }}
                >
                  <AddPhotoAlternateIcon fontSize="small" color="disabled" />
                </Box>
              </Tooltip>
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
        label="Nome da mesa"
        value={roomName}
        onChange={(e) => setRoomName(e.target.value)}
        placeholder="Ex.: A Maldição de Strahd"
        required
        inputProps={{ maxLength: ROOM_NAME_MAX, 'aria-label': 'Nome da mesa' }}
        helperText={
          trimmedRoom.length === 0
            ? 'Obrigatório'
            : isValidRoomName(trimmedRoom)
              ? `${trimmedRoom.length}/${ROOM_NAME_MAX}`
              : 'Nome muito longo'
        }
        error={trimmedRoom.length > 0 && !isValidRoomName(trimmedRoom)}
      />

      <TextField
        label="Descrição (opcional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Um breve contexto para os jogadores"
        multiline
        minRows={3}
        inputProps={{ maxLength: ROOM_DESC_MAX }}
        helperText={`${description.length}/${ROOM_DESC_MAX}`}
      />

      <Box>
        <Button
          type="submit"
          size="large"
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          endIcon={<ArrowForwardIcon />}
          disabled={!isValid || isLoading === true}
          fullWidth
        >
          Criar e entrar
        </Button>
      </Box>
    </Stack>
  );
}
