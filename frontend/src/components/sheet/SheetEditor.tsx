/**
 * SheetEditor — editor de ficha (Character) em modo JSON.
 *
 * A MVP define a ficha como "estrutura JSON flexível". Em vez de
 * tentar modelar campos de D&D/Tormenta/etc, deixamos um editor
 * de JSON bruto:
 *   - Validação ao sair do campo (onBlur).
 *   - Botão "Salvar" desabilitado enquanto o JSON é inválido.
 *   - Botão "Cancelar" descarta as mudanças.
 *
 * `onSave(payload)` é assíncrono no consumer (SheetPage) — aqui
 * só disparamos o callback e deixamos o estado de "saving" ser
 * controlado pelo `disabled` externo.
 */
import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, Stack, TextField, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { useToast } from '@/hooks/useToast';
import type { Character } from '@/types';

export interface SheetEditorProps {
  character: Character;
  onSave: (next: { name: string; data: Record<string, unknown> }) => void | Promise<void>;
  disabled?: boolean;
}

function formatJson(data: Record<string, unknown>): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return '{}';
  }
}

function safeParseJson(text: string): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { ok: false, error: 'O JSON precisa ser um objeto (não array nem primitivo).' };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'JSON inválido' };
  }
}

export function SheetEditor({ character, onSave, disabled }: SheetEditorProps) {
  const toast = useToast();
  const [name, setName] = useState<string>(character.name);
  const [text, setText] = useState<string>(formatJson(character.data));

  // Sincroniza caso a prop mude (ex.: troca de personagem).
  useEffect(() => {
    setName(character.name);
    setText(formatJson(character.data));
  }, [character.id, character.name, character.data]);

  const parseResult = useMemo(() => safeParseJson(text), [text]);
  const isDirty =
    name !== character.name || (parseResult.ok && JSON.stringify(parseResult.value) !== JSON.stringify(character.data));

  const handleSave = (): void => {
    if (!parseResult.ok) {
      toast.error(parseResult.error);
      return;
    }
    void onSave({ name: name.trim() || character.name, data: parseResult.value });
  };

  const handleReset = (): void => {
    setName(character.name);
    setText(formatJson(character.data));
  };

  return (
    <Card sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="overline" color="text.secondary">
            Editar ficha
          </Typography>
          <TextField
            label="Nome do personagem"
            value={name}
            onChange={(e) => setName(e.target.value)}
            size="small"
            fullWidth
            inputProps={{ maxLength: 60 }}
            disabled={disabled === true}
          />
        </Box>

        <Box>
          <Typography variant="overline" color="text.secondary">
            Dados (JSON)
          </Typography>
          <TextField
            value={text}
            onChange={(e) => setText(e.target.value)}
            multiline
            minRows={10}
            fullWidth
            error={!parseResult.ok}
            helperText={
              parseResult.ok
                ? 'Estrutura JSON livre. Suporta objetos aninhados.'
                : parseResult.error
            }
            disabled={disabled === true}
            slotProps={{
              input: { sx: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13 } },
            }}
          />
        </Box>

        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button
            variant="text"
            startIcon={<RestartAltIcon />}
            onClick={handleReset}
            disabled={!isDirty || disabled === true}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={!isDirty || !parseResult.ok || disabled === true}
          >
            {disabled ? 'Salvando…' : 'Salvar'}
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}
