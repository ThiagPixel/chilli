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
 * Por enquanto a fonte de dados é o store Zustand (chat.store)
 * — populado via Socket.IO na fase 5. O composer chama
 * `useChat().send` (no-op) e exibe um toast "em breve".
 */
import { useMemo } from 'react';
import { Box, Stack } from '@mui/material';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { usePlayersStore } from '@/stores/players.store';
import { MessageList } from './MessageList';
import { Composer } from './Composer';
import type { Message, User } from '@/types';

export interface ChatPanelProps {
  roomCode: string;
}

export function ChatPanel({ roomCode: _roomCode }: ChatPanelProps) {
  const { messages, send } = useChat();
  const { user } = useAuth();
  const toast = useToast();
  const members = usePlayersStore((s) => s.members);

  // Mapa userId → User para resolver nome/avatar nas mensagens.
  const authors = useMemo<Record<string, User>>(() => {
    const map: Record<string, User> = {};
    for (const m of members) map[m.user.id] = m.user;
    return map;
  }, [members]);

  const handleSend = (_body: string) => {
    // Stub: implementação real (Socket.IO) entra na fase 5.
    void send;
    toast.info('Envio de mensagens chega na próxima fase.');
  };

  // Filtramos mensagens inválidas (sem tipo) por segurança.
  const visible = useMemo<Message[]>(() => messages.filter(Boolean), [messages]);

  return (
    <Stack sx={{ flex: 1, minHeight: 0 }} data-room={_roomCode}>
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <MessageList
          messages={visible}
          authors={authors}
          currentUserId={user?.id ?? null}
          footer={
            <Composer
              onSend={handleSend}
              placeholder={user ? `Mensagem como ${user.name}…` : 'Mensagem…'}
            />
          }
        />
      </Box>
    </Stack>
  );
}
