/**
 * Drawer — menu lateral (mobile: modal/over; desktop: persistent).
 */
import { Box, Divider, Drawer as MuiDrawer, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import LoginIcon from '@mui/icons-material/Login';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { PATHS } from '@/routes/paths';

const DRAWER_WIDTH = 280;

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  variant?: 'temporary' | 'persistent';
}

export function Drawer({ open, onClose, variant = 'temporary' }: DrawerProps) {
  const navigate = useNavigate();

  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <MuiDrawer
      anchor="left"
      open={open}
      onClose={onClose}
      variant={variant}
      ModalProps={{ keepMounted: true }}
      slotProps={{
        paper: { sx: { width: DRAWER_WIDTH, maxWidth: '85vw' } },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" color="primary" fontWeight={800}>
          Chilli
        </Typography>
        <Typography variant="caption" color="text.secondary">
          O WhatsApp dos RPGs
        </Typography>
      </Box>
      <Divider />
      <List>
        <ListItemButton onClick={() => go(PATHS.home)}>
          <ListItemIcon><HomeIcon /></ListItemIcon>
          <ListItemText primary="Início" />
        </ListItemButton>
        <ListItemButton onClick={() => go(PATHS.createRoom)}>
          <ListItemIcon><AddIcon /></ListItemIcon>
          <ListItemText primary="Criar mesa" />
        </ListItemButton>
        <ListItemButton onClick={() => go(PATHS.joinRoom)}>
          <ListItemIcon><LoginIcon /></ListItemIcon>
          <ListItemText primary="Entrar com código" />
        </ListItemButton>
      </List>
    </MuiDrawer>
  );
}
