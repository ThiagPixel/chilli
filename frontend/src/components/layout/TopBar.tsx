/**
 * TopBar — cabeçalho fixo com título e ações.
 * Mobile-first: 56px de altura.
 */
import { AppBar, Box, IconButton, Toolbar, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

export interface TopBarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  right?: React.ReactNode;
}

export function TopBar({ title, subtitle, onMenuClick, right }: TopBarProps) {
  return (
    <AppBar position="sticky" color="inherit" elevation={0}>
      <Toolbar
        sx={{
          // iOS notch — soma safe-area à altura base de 56px.
          minHeight: 'calc(56px + env(safe-area-inset-top)) !important',
          gap: 1,
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        {onMenuClick ? (
          <IconButton
            edge="start"
            aria-label="Abrir menu"
            onClick={onMenuClick}
            size="small"
          >
            <MenuIcon />
          </IconButton>
        ) : null}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap>
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {right}
      </Toolbar>
    </AppBar>
  );
}
