/**
 * SheetPage — aba "Ficha" da sala.
 *
 * Mostra a ficha do jogador atual (você):
 *   - Se já tem ficha: alterna entre "ver" e "editar".
 *   - Se ainda não tem: editor com template mínimo vazio.
 *
 * Stub: a fonte da verdade é `sheetService.upsert`/`update`,
 * chamado via `onSave` (no-op com toast na fase 5).
 */
import { useState } from 'react';
import { Box, Button, Stack } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { SheetRenderer } from '@/components/sheet/SheetRenderer';
import { SheetEditor } from '@/components/sheet/SheetEditor';
import { EmptyState } from '@/components/ui';
import DescriptionIcon from '@mui/icons-material/Description';
import { useAuth } from '@/hooks/useAuth';
import type { Character } from '@/types';

export interface SheetPageProps {
  roomCode: string;
}

/** Template inicial para uma ficha nova. */
function emptySheet(userName: string): Character {
  return {
    id: 'draft',
    roomId: '',
    userId: '',
    name: userName || 'Sem nome',
    data: {
      classe: '',
      nivel: 1,
      raca: '',
      atributos: {
        forca: 10,
        destreza: 10,
        constituicao: 10,
        inteligencia: 10,
        sabedoria: 10,
        carisma: 10,
      },
      pericias: [],
      inventario: [],
      notas: '',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function SheetPage({ roomCode: _roomCode }: SheetPageProps) {
  const { user } = useAuth();
  const [sheet, setSheet] = useState<Character | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(true);

  const handleStart = () => {
    if (sheet) {
      setIsEditing(true);
      return;
    }
    setSheet(emptySheet(user?.name ?? 'Personagem'));
    setIsEditing(true);
  };

  const handleSave = (next: { name: string; data: Record<string, unknown> }) => {
    if (!sheet) return;
    setSheet({ ...sheet, name: next.name, data: next.data });
    setIsEditing(false);
  };

  if (!sheet) {
    return (
      <Stack sx={{ flex: 1, minHeight: 0 }} spacing={2}>
        <EmptyState
          icon={<DescriptionIcon fontSize="inherit" />}
          title="Você ainda não tem ficha"
          description="A ficha é uma estrutura JSON flexível — você pode usar o esquema que preferir."
          action={
            <Button variant="contained" startIcon={<EditIcon />} onClick={handleStart}>
              Criar ficha
            </Button>
          }
        />
      </Stack>
    );
  }

  return (
    <Stack sx={{ flex: 1, minHeight: 0 }} spacing={2}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          size="small"
          variant="text"
          startIcon={isEditing ? <VisibilityIcon /> : <EditIcon />}
          onClick={() => setIsEditing((v) => !v)}
        >
          {isEditing ? 'Ver ficha' : 'Editar'}
        </Button>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {isEditing ? (
          <SheetEditor character={sheet} onSave={handleSave} />
        ) : (
          <SheetRenderer character={sheet} />
        )}
      </Box>
    </Stack>
  );
}
