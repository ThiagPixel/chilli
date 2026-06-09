/**
 * EmptyState — ilustração + título + descrição. Para listas vazias.
 */
import { Box, Stack, Typography } from '@mui/material';
import { type ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1.5}
      sx={{
        textAlign: 'center',
        py: 6,
        px: 2,
        color: 'text.secondary',
      }}
    >
      {icon ? <Box sx={{ fontSize: 48, color: 'text.disabled' }}>{icon}</Box> : null}
      <Typography variant="h4" color="text.primary">
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" sx={{ maxWidth: 320 }}>
          {description}
        </Typography>
      ) : null}
      {action}
    </Stack>
  );
}
