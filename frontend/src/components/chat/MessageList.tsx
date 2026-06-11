/**
 * MessageList — render de uma lista de mensagens com auto-scroll.
 *
 * O scroll "inteligente" só desce até o final se o usuário já
 * estiver próximo do fundo quando chega uma mensagem nova — caso
 * contrário, mostra um botão flutuante "X novas mensagens".
 *
 * O `scrollerRef` pode ser passado de fora para integrar com
 * `usePullToRefresh` (o pai anexa os handlers de touch no
 * scroller via esse ref).
 */
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Box, Button, Stack } from '@mui/material';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { MessageItem } from './MessageItem';
import type { Message, User } from '@/types';

const PIXELS_FROM_BOTTOM = 120;

export interface AuthorMap {
  [userId: string]: User;
}

export interface MessageListProps {
  messages: Message[];
  /** Mapa userId → User para resolver nome/avatar. */
  authors?: AuthorMap;
  /** User id do "eu" para alinhar à direita. */
  currentUserId?: string | null;
  /** Slot inferior (ex.: Composer). */
  footer?: ReactNode;
  /**
   * Ref externo para o scroller. Usado pelo pai (ChatPanel) para
   * passar o scroller para `usePullToRefresh`. Se omitido, um
   * ref interno é criado (e o pull-to-refresh não funciona).
   */
  scrollerRef?: RefObject<HTMLDivElement | null>;
}

export function MessageList({
  messages,
  authors,
  currentUserId,
  footer,
  scrollerRef: externalScrollerRef,
}: MessageListProps) {
  const internalScrollerRef = useRef<HTMLDivElement | null>(null);
  // Usa ref externo se passado, senão interno.
  const scrollerRef = externalScrollerRef ?? internalScrollerRef;
  const lastMessageCount = useRef<number>(messages.length);
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Auto-scroll: só desce se o usuário já estava perto do fundo.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const newCount = messages.length;
    if (newCount === lastMessageCount.current) return;
    const delta = newCount - lastMessageCount.current;
    lastMessageCount.current = newCount;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < PIXELS_FROM_BOTTOM) {
      el.scrollTop = el.scrollHeight;
    } else if (delta > 0) {
      setPendingCount((c) => c + delta);
    }
  }, [messages, scrollerRef]);

  const scrollToBottom = () => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
    setPendingCount(0);
  };

  return (
    <Box sx={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <Box
        ref={scrollerRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          // Pequeno "respiro" visual no fundo.
          pb: 1,
        }}
      >
        <Stack spacing={0.25} sx={{ py: 1 }}>
          {messages.map((m) => {
            const author = m.userId ? authors?.[m.userId] : undefined;
            return (
              <MessageItem
                key={m.id}
                message={m}
                isOwn={Boolean(currentUserId && m.userId === currentUserId)}
                {...(author?.name ? { authorName: author.name } : {})}
                authorAvatarUrl={author?.avatarUrl ?? null}
              />
            );
          })}
        </Stack>
      </Box>

      {pendingCount > 0 ? (
        <Button
          onClick={scrollToBottom}
          size="small"
          variant="contained"
          startIcon={<ArrowDownwardIcon />}
          sx={{
            position: 'absolute',
            left: '50%',
            bottom: 12,
            transform: 'translateX(-50%)',
            borderRadius: 999,
            boxShadow: 2,
          }}
        >
          {pendingCount} nova{pendingCount === 1 ? '' : 's'}
        </Button>
      ) : null}

      {footer}
    </Box>
  );
}
