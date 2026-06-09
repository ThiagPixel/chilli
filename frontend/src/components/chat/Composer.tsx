/**
 * Composer — input de mensagem com botão de enviar.
 *
 * Atalhos:
 *   - Enter: envia.
 *   - Shift+Enter: quebra linha.
 *   - "/" no início: mostra hint de comando (ex.: /r 2d6+3).
 *     (a rolagem de dado real é feita na fase 5 via Socket.IO;
 *      aqui disparamos `onSend` e o painel mostra "em breve".)
 *
 * Layout: TextField multilinha + botão de enviar (FAB no mobile).
 * Em desktop, o botão fica à direita do input.
 */
import { useRef, useState, type KeyboardEvent } from 'react';
import { Box, IconButton, Paper, TextField, Tooltip } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CasinoIcon from '@mui/icons-material/Casino';
import { MESSAGE_MAX, isValidMessageBody } from '@/utils';
import { parseSimpleExpression } from '@/components/dice/diceParser';

export interface ComposerProps {
  onSend: (body: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function Composer({ onSend, disabled, placeholder = 'Mensagem…' }: ComposerProps) {
  const [value, setValue] = useState<string>('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const trimmed = value.trim();
  const isValid = isValidMessageBody(trimmed);
  const isDiceCmd = trimmed.startsWith('/r ') || trimmed.startsWith('/d ');
  const diceExpression = isDiceCmd ? trimmed.slice(3).trim() : '';
  const diceLooksValid = parseSimpleExpression(diceExpression) !== null;

  const submit = () => {
    if (!isValid || disabled) return;
    onSend(trimmed);
    setValue('');
    inputRef.current?.focus();
  };

  const rollDice = () => {
    if (!diceLooksValid || disabled) return;
    onSend(trimmed);
    setValue('');
    inputRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isDiceCmd) {
        rollDice();
      } else {
        submit();
      }
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 1,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 1,
        borderTop: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <TextField
        inputRef={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled === true}
        multiline
        maxRows={4}
        size="small"
        sx={{ flex: 1 }}
        slotProps={{
          htmlInput: { maxLength: MESSAGE_MAX },
        }}
        helperText={
          isDiceCmd
            ? diceLooksValid
              ? 'Enter rola este dado'
              : 'Expressão inválida (ex.: 2d6+3)'
            : `${trimmed.length}/${MESSAGE_MAX}`
        }
      />

      {isDiceCmd ? (
        <Tooltip title="Rolar dado">
          <span>
            <IconButton
              color="secondary"
              onClick={rollDice}
              disabled={disabled || !diceLooksValid}
              size="large"
            >
              <CasinoIcon />
            </IconButton>
          </span>
        </Tooltip>
      ) : null}

      <Tooltip title="Enviar">
        <span>
          <IconButton
            color="primary"
            onClick={submit}
            disabled={disabled || !isValid}
            size="large"
          >
            <SendIcon />
          </IconButton>
        </span>
      </Tooltip>

      {/* Mantém o box dentro de 100% mesmo quando vazio. */}
      <Box sx={{ display: 'none' }} aria-hidden />
    </Paper>
  );
}
