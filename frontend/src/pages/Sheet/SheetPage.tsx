/**
 * SheetPage — aba "Ficha" da sala.
 *
 * Mostra a ficha do jogador atual (você):
 *   - Se já tem ficha: alterna entre "ver" e "editar".
 *   - Se ainda não tem: editor com template mínimo vazio.
 *
 * Persistência: `sheetService.upsert(code, { name, data })` para criar
 * ou atualizar (o backend faz UPSERT por (room, user)).
 */
import { useEffect, useState } from 'react';
import { Box, Button, Stack } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { SheetRenderer } from '@/components/sheet/SheetRenderer';
import { SheetEditor } from '@/components/sheet/SheetEditor';
import { EmptyState } from '@/components/ui';
import DescriptionIcon from '@mui/icons-material/Description';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { sheetService } from '@/services';
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

export function SheetPage({ roomCode }: SheetPageProps) {
  const { user } = useAuth();
  const toast = useToast();
  const [sheet, setSheet] = useState<Character | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Tenta carregar a ficha existente do jogador nesta sala.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await sheetService.list(roomCode);
        if (cancelled) return;
        const mine = res.find((c) => user && c.userId === user.id);
        if (mine) {
          setSheet(mine);
          setIsEditing(false);
        }
      } catch {
        // Silencioso: se falhar, fica na tela de "criar ficha".
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomCode, user]);

  const handleStart = (): void => {
    if (sheet) {
      setIsEditing(true);
      return;
    }
    setSheet(emptySheet(user?.name ?? 'Personagem'));
    setIsEditing(true);
  };

  const handleSave = async (next: { name: string; data: Record<string, unknown> }): Promise<void> => {
    if (!sheet) return;
    setIsSaving(true);
    try {
      const saved = await sheetService.upsert(roomCode, { name: next.name, data: next.data });
      setSheet(saved);
      setIsEditing(false);
      toast.success('Ficha salva.');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Falha ao salvar ficha';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
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
          disabled={isSaving}
        >
          {isEditing ? 'Ver ficha' : 'Editar'}
        </Button>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {isEditing ? (
          <SheetEditor character={sheet} onSave={handleSave} disabled={isSaving} />
        ) : (
          <SheetRenderer character={sheet} />
        )}
      </Box>
    </Stack>
  );
}
