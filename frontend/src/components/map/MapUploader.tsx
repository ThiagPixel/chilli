/**
 * MapUploader — dropzone para o mestre subir uma imagem de mapa.
 *
 * Visual: caixa pontilhada com ícone. Aceita:
 *   - Arrastar e soltar (drag&drop).
 *   - Toque/clique → abre seletor de arquivo.
 *
 * Valida tipo (image/*) e tamanho (até 10 MB) antes de chamar
 * `onUpload`. O consumer (MapView) é quem de fato envia o arquivo
 * para o backend.
 */
import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useToast } from '@/hooks/useToast';

const MAX_BYTES = 10 * 1024 * 1024;

export interface MapUploaderProps {
  onUpload: (file: File) => void;
  disabled?: boolean;
}

export function MapUploader({ onUpload, disabled }: MapUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const toast = useToast();

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.');
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error('Imagem muito grande (máx. 10 MB).');
      return;
    }
    onUpload(file);
  };

  const onDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <Box
      component="label"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      sx={{
        display: 'block',
        border: '2px dashed',
        borderColor: isDragging ? 'primary.main' : 'divider',
        borderRadius: 2,
        bgcolor: isDragging ? 'action.hover' : 'background.paper',
        p: 3,
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 120ms ease',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onChange}
        disabled={disabled}
      />
      <Stack alignItems="center" spacing={1}>
        <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main' }} />
        <Typography variant="h4" sx={{ fontSize: '1rem', fontWeight: 600 }}>
          Suba um mapa
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Arraste uma imagem ou toque para escolher. JPG, PNG. Até 10 MB.
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<CloudUploadIcon />}
          disabled={disabled === true}
          onClick={() => inputRef.current?.click()}
        >
          Escolher arquivo
        </Button>
      </Stack>
    </Box>
  );
}
