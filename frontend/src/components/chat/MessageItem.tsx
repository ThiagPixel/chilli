/**
 * MessageItem — uma mensagem (bolha ou linha de sistema).
 *
 * Visual:
 *   - Mensagem de texto: avatar circular + nome + bolha.
 *   - Mensagem de sistema: linha centralizada, sem avatar, cor secundária.
 *
 * "Própria" (isOwn) alinha à direita com cor de marca e sem avatar
 * repetido (a coluna do avatar fica oculta para encurtar).
 */
import { Avatar, Box, Stack, Typography } from '@mui/material';
import { formatChatTimestamp } from '@/utils';
import type { Message } from '@/types';

export interface MessageItemProps {
  message: Message;
  /** Nome do autor — vem do join client-side. */
  authorName?: string;
  /** URL do avatar do autor (se houver). */
  authorAvatarUrl?: string | null;
  isOwn: boolean;
}

export function MessageItem({ message, authorName, authorAvatarUrl, isOwn }: MessageItemProps) {
  if (message.type === 'system') {
    return <SystemMessage content={message.content} />;
  }

  const displayName = authorName ?? 'Anônimo';
  const time = formatChatTimestamp(message.createdAt);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isOwn ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
        gap: 1,
        px: 1,
        py: 0.5,
      }}
    >
      {/* Coluna de avatar — escondida para "próprias" para encurtar. */}
      <Box sx={{ width: 32, flexShrink: 0 }}>
        {!isOwn ? (
          <Avatar
            {...(authorAvatarUrl ? { src: authorAvatarUrl } : {})}
            alt={displayName}
            sx={{ width: 32, height: 32, fontSize: 14 }}
          >
            {displayName.charAt(0).toUpperCase()}
          </Avatar>
        ) : null}
      </Box>

      <Stack
        spacing={0.25}
        alignItems={isOwn ? 'flex-end' : 'flex-start'}
        sx={{ minWidth: 0, maxWidth: '78%' }}
      >
        {!isOwn ? (
          <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
            {displayName}
          </Typography>
        ) : null}
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderRadius: 2,
            bgcolor: isOwn ? 'primary.main' : 'background.paper',
            color: isOwn ? 'primary.contrastText' : 'text.primary',
            border: isOwn ? 'none' : '1px solid',
            borderColor: 'divider',
            boxShadow: '0 1px 1px rgba(0,0,0,0.04)',
            // Quebra bonita de palavras longas (código, URLs).
            overflowWrap: 'anywhere',
            whiteSpace: 'pre-wrap',
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: 'inherit',
              fontSize: '0.95rem',
              lineHeight: 1.4,
            }}
          >
            {message.content}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.disabled" sx={{ px: 1, fontSize: '0.7rem' }}>
          {time}
        </Typography>
      </Stack>
    </Box>
  );
}

function SystemMessage({ content }: { content: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 0.5, px: 2 }}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          fontStyle: 'italic',
          bgcolor: 'action.hover',
          px: 1.5,
          py: 0.25,
          borderRadius: 999,
          textAlign: 'center',
        }}
      >
        {content}
      </Typography>
    </Box>
  );
}
