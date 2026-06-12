/**
 * ChatPanel — chat em tempo real da sala.
 *
 * Estrutura:
 *   ┌──────────────────────┐
 *   │  MessageList         │
 *   │  (flex: 1, scroll)   │
 *   ├──────────────────────┤
 *   │  Composer (footer)   │
 *   └──────────────────────┘
 *
 * O Composer recebe `onSend(body)` e despacha:
 *   - `/r 2d6+3` ou `/d 2d6+3` → `useDice().roll(expr)` (vai pro histórico de dados)
 *   - qualquer outro texto → `useChat().send(body)`
 *
 * Pull-to-refresh + botão "Atualizar" (desktop) via `RefreshableScroller`
 * chamam `useChat().refresh()`.
 */
import { useMemo, useRef } from 'react';
import { Stack } from '@mui/material';
import { useChat } from '@/hooks/useChat';
import { useDice } from '@/hooks/useDice';
import { useAuth } from '@/hooks/useAuth';
import { usePlayersStore } from '@/stores/players.store';
import { RefreshableScroller } from '@/components/ui';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import { parseSimpleExpression } from '@/components/dice/diceParser';
import type { Message, User } from '@/types';

export interface ChatPanelProps {
  roomCode: string;
}

export function ChatPanel({ roomCode }: ChatPanelProps) {
  const { messages, send, refresh } = useChat();
  const { roll } = useDice();
  const { user } = useAuth();
  const members = usePlayersStore((s) => s.members);

  // Mapa userId → User para resolver nome/avatar nas mensagens.
  const authors = useMemo<Record<string, User>>(() => {
    const map: Record<string, User> = {};
    for (const m of members) map[m.user.id] = m.user;
    return map;
  }, [members]);

  const handleSend = (body: string): void => {
    const trimmed = body.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('/r ') || trimmed.startsWith('/d ')) {
      const expr = trimmed.slice(3).trim();
      // Validação local rápida; o servidor revalida e devolve erro se inválida.
      if (parseSimpleExpression(expr) === null) {
        return;
      }
      void roll(expr);
      return;
    }
    void send(trimmed);
  };

  const visible = useMemo<Message[]>(() => messages.filter(Boolean), [messages]);

  // Ref do scroller do MessageList — o RefreshableScroller anexa
  // os handlers de touch nele.
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  return (
    <Stack sx={{ flex: 1, minHeight: 0 }} data-room={roomCode}>
      <RefreshableScroller
        onRefresh={refresh}
        refreshLabel="Atualizar chat"
        scrollerRef={scrollerRef}
      >
        <MessageList
          messages={visible}
          authors={authors}
          currentUserId={user?.id ?? null}
          scrollerRef={scrollerRef}
          footer={
            <Composer
              onSend={handleSend}
              placeholder={user ? `Mensagem como ${user.name}…` : 'Mensagem…'}
            />
          }
        />
      </RefreshableScroller>
    </Stack>
  );
}
