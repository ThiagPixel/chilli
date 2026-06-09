# Chilli — Frontend

React + Vite + TypeScript + Material UI. Mobile-first (390px → tablet → desktop).

## Stack

- **React 18** + **TypeScript estrito**
- **Vite 5** (build/dev server)
- **Material UI 6** (componentes + theming)
- **React Router 6** (roteamento)
- **Socket.IO Client** (tempo real)
- **Zustand** (estado local leve)
- **vite-plugin-pwa** (instalável)
- **Vitest** + **React Testing Library** (testes)

## Estrutura

```
src/
├── components/      # UI (chat, dice, map, players, sheet, layout, ui)
├── pages/           # Home, CreateRoom, JoinRoom, Room
├── services/        # api, socket, auth, room, chat, dice, map, sheet
├── hooks/           # useAuth, useSocket, useRoom, useChat, useDice, ...
├── contexts/        # AuthContext, RoomContext, SocketContext
├── stores/          # zustand: chat, dice, players, map
├── routes/          # paths, guards, router
├── types/           # domain, socket, api (alinhados ao backend)
├── utils/           # storage, id, format, validators
├── styles/          # theme MUI + global.css
└── test/            # setup, utils, mocks
```

## Comandos

```bash
npm install          # instala deps
npm run dev          # dev server em :5173 (proxy para backend em :3000)
npm run typecheck    # tsc --noEmit
npm run build        # build de produção em dist/
npm run preview      # serve dist/ local
npm test             # vitest run
```

## Rotas

| Path          | Página          | Auth |
|---------------|-----------------|------|
| `/`           | Home            | —    |
| `/criar`      | CreateRoom      | ✓    |
| `/entrar`     | JoinRoom        | —    |
| `/r/:code`    | Room            | ✓    |
| `*`           | 404             | —    |

## Configuração

- `VITE_API_URL` — URL do backend (vazio = proxy do Vite em dev).
- `VITE_SOCKET_URL` — URL do Socket.IO (vazio = mesmo proxy).

Copie `.env.example` para `.env` e ajuste conforme necessário.
