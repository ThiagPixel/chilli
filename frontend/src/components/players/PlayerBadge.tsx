/**
 * PlayerBadge — avatar + nome + papel (mestre/jogador) + ação.
 *
 * Renderiza um cartão horizontal com:
 *   - Avatar circular (com fallback da inicial).
 *   - Nome + chip de papel.
 *   - Indicador de presença (bolinha verde/cinza).
 *   - Slot `right` para ações (ex.: "abrir ficha", "iniciar turno").
 *   - Borda primary + chip "Vez" quando `isTurnHolder` (este jogador
 *     tem o turno ativo na mesa).
 */
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import type { User, RoomMember } from '@/types';

export interface PlayerBadgeProps {
  user: User;
  role: RoomMember['role'];
  isOnline?: boolean;
  isTurnHolder?: boolean;
  right?: ReactNode;
}

export function PlayerBadge({
  user,
  role,
  isOnline = true,
  isTurnHolder = false,
  right,
}: PlayerBadgeProps) {
  const isMaster = role === 'master';
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.5}
      sx={{
        p: 1.5,
        borderRadius: 2,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: isTurnHolder ? 'primary.main' : 'divider',
        ...(isTurnHolder
          ? { boxShadow: '0 0 0 2px rgba(25, 118, 210, 0.15)' }
          : {}),
      }}
    >
      <Box sx={{ position: 'relative', flexShrink: 0 }}>
        <Box
          component="img"
          {...(user.avatarUrl ? { src: user.avatarUrl, alt: user.name } : {})}
          sx={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            bgcolor: 'primary.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'primary.contrastText',
            fontWeight: 700,
            fontSize: '1.1rem',
            objectFit: 'cover',
            ...(user.avatarUrl
              ? {}
              : {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  '&::before': { content: `"${user.name.charAt(0).toUpperCase()}"` },
                }),
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 12,
            height: 12,
            borderRadius: '50%',
            bgcolor: isOnline ? 'success.main' : 'text.disabled',
            border: '2px solid',
            borderColor: 'background.paper',
          }}
          aria-label={isOnline ? 'Online' : 'Offline'}
        />
      </Box>

      <Stack sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" noWrap sx={{ fontWeight: 600 }}>
          {user.name}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <Chip
            label={isMaster ? 'Mestre' : 'Jogador'}
            size="small"
            color={isMaster ? 'primary' : 'default'}
            variant={isMaster ? 'filled' : 'outlined'}
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
          {isTurnHolder ? (
            <Chip
              label="Vez"
              size="small"
              color="primary"
              variant="filled"
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          ) : null}
        </Stack>
      </Stack>

      {right ? <Box sx={{ flexShrink: 0 }}>{right}</Box> : null}
    </Stack>
  );
}
