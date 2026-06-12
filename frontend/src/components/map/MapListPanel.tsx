/**
 * MapListPanel — lista de mapas da sala (mestre).
 *
 * Visível apenas para o mestre. Mostra todos os mapas com:
 *   - Nome editável inline (clica no lápis → input → Enter/blur salva).
 *   - Botão "Ativar" quando não é o ativo.
 *   - Botão "Deletar" (lixeira) com `window.confirm` para confirmar.
 *   - Indicador visual do mapa ativo (chip "Ativo" + borda destacada).
 *
 * A fonte de verdade é o `maps:list` do servidor — mas fazemos update
 * otimista via `useMapStore.upsertMap` / `removeMap` para feedback
 * instantâneo. Se o evento chegar com divergência, sobrescreve.
 *
 * Estado vazio: "Nenhum mapa ainda — suba um acima."
 */
import { useState, type KeyboardEvent } from 'react';
import {
  Box,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import { mapService } from '@/services';
import { useMapStore } from '@/stores/map.store';
import { useToast } from '@/hooks/useToast';
import type { RoomMap } from '@/types';

export interface MapListPanelProps {
  roomCode: string;
  maps: RoomMap[];
}

export function MapListPanel({ roomCode, maps }: MapListPanelProps) {
  const upsertMap = useMapStore((s) => s.upsertMap);
  const removeMap = useMapStore((s) => s.removeMap);
  const toast = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState<string>('');

  if (maps.length === 0) {
    return (
      <Box
        sx={{
          border: '1px dashed',
          borderColor: 'divider',
          borderRadius: 2,
          p: 2,
          textAlign: 'center',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Nenhum mapa ainda — suba um acima.
        </Typography>
      </Box>
    );
  }

  const handleStartEdit = (m: RoomMap): void => {
    setEditingId(m.id);
    setDraftName(m.name);
  };

  const handleCancelEdit = (): void => {
    setEditingId(null);
    setDraftName('');
  };

  const handleSaveEdit = async (mapId: string): Promise<void> => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      toast.error('Nome não pode ficar vazio.');
      return;
    }
    const current = maps.find((m) => m.id === mapId);
    if (!current || trimmed === current.name) {
      handleCancelEdit();
      return;
    }
    try {
      const updated = await mapService.rename(roomCode, mapId, trimmed);
      upsertMap(updated);
      setEditingId(null);
      setDraftName('');
      toast.success('Mapa renomeado.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha ao renomear';
      toast.error(message);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, mapId: string): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSaveEdit(mapId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleActivate = async (mapId: string): Promise<void> => {
    try {
      const updated = await mapService.activate(roomCode, mapId);
      upsertMap(updated);
      toast.success('Mapa ativado.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha ao ativar';
      toast.error(message);
    }
  };

  const handleDelete = async (m: RoomMap): Promise<void> => {
    const ok = window.confirm(`Deletar o mapa "${m.name}"? Esta ação não pode ser desfeita.`);
    if (!ok) return;
    try {
      await mapService.delete(roomCode, m.id);
      removeMap(m.id);
      toast.success('Mapa deletado.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha ao deletar';
      toast.error(message);
    }
  };

  return (
    <List
      disablePadding
      sx={{
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        overflow: 'hidden',
      }}
    >
      {maps.map((m) => {
        const isEditing = editingId === m.id;
        return (
          <ListItem
            key={m.id}
            sx={{
              borderBottom: '1px solid',
              borderColor: 'divider',
              '&:last-of-type': { borderBottom: 0 },
              ...(m.isActive
                ? { borderLeft: '3px solid', borderLeftColor: 'primary.main' }
                : {}),
            }}
          >
            {isEditing ? (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ flex: 1 }}>
                <TextField
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, m.id)}
                  onBlur={() => void handleSaveEdit(m.id)}
                  size="small"
                  autoFocus
                  fullWidth
                  inputProps={{ maxLength: 100 }}
                />
                <IconButton
                  size="small"
                  color="primary"
                  aria-label="salvar"
                  onMouseDown={(e) => e.preventDefault() /* não dispara blur antes */}
                  onClick={() => void handleSaveEdit(m.id)}
                >
                  <CheckIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" aria-label="cancelar" onClick={handleCancelEdit}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            ) : (
              <>
                <ListItemText
                  primary={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: m.isActive ? 600 : 400 }}>
                        {m.name}
                      </Typography>
                      {m.isActive ? (
                        <Chip label="Ativo" size="small" color="primary" />
                      ) : null}
                    </Stack>
                  }
                />
                <ListItemSecondaryAction>
                  <Stack direction="row" spacing={0.5}>
                    <IconButton
                      size="small"
                      edge="end"
                      aria-label="renomear"
                      onClick={() => handleStartEdit(m)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {m.isActive ? (
                      <IconButton size="small" edge="end" aria-label="já ativo" disabled>
                        <StarIcon fontSize="small" color="primary" />
                      </IconButton>
                    ) : (
                      <IconButton
                        size="small"
                        edge="end"
                        aria-label="ativar"
                        onClick={() => void handleActivate(m.id)}
                      >
                        <StarBorderIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      edge="end"
                      aria-label="deletar"
                      onClick={() => void handleDelete(m)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </ListItemSecondaryAction>
              </>
            )}
          </ListItem>
        );
      })}
    </List>
  );
}
