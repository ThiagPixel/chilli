/**
 * PlayerBadge — avatar + nome + papel (mestre/jogador) + ação.
 *
 * Renderiza um cartão horizontal com:
 *   - Avatar circular (com fallback da inicial).
 *   - Nome + chip de papel.
 *   - Indicador de presença (bolinha verde/cinza).
 *   - Slot `right` para ações (ex.: "abrir ficha").
 */
import { Box, Chip, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import type { User, RoomMember } from '@/types';

export interface PlayerBadgeProps {
  user: User;
  role: RoomMember['role'];
  isOnline?: boolean;
  right?: ReactNode;
}

export function PlayerBadge({ user, role, isOnline = true, right }: PlayerBadgeProps) {
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
        borderColor: 'divider',
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
        <Chip
          label={isMaster ? 'Mestre' : 'Jogador'}
          size="small"
          color={isMaster ? 'primary' : 'default'}
          variant={isMaster ? 'filled' : 'outlined'}
          sx={{ alignSelf: 'flex-start', height: 20, fontSize: '0.7rem' }}
        />
      </Stack>

      {right ? <Box sx={{ flexShrink: 0 }}>{right}</Box> : null}
    </Stack>
  );
}
