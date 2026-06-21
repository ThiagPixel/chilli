# Chilli — Documentação Técnica

> Referência para quem mantém, evolui ou opera a plataforma.
> Última atualização: 16/06/2026.

---

## 1. Visão geral

Chilli é uma plataforma de RPG de mesa online. O objetivo central é que um
mestre consiga **criar uma mesa e começar a sessão em menos de 30 segundos**.

Princípios não negociáveis:

- **Simplicidade** — poucas dependências, poucos conceitos.
- **Mobile First** — desenhado para 390 px antes de tablet/desktop.
- **Performance** — caminho curto entre interação e feedback.
- **Baixo custo operacional** — uma única VPS, sem microserviços.
- **Fácil manutenção** — TypeScript estrito, código legível.

---

## 2. Stack

| Camada         | Tecnologia                                |
|----------------|-------------------------------------------|
| Frontend       | React + TypeScript + React Router + MUI   |
| Realtime       | Socket.IO                                 |
| Backend        | Node.js + Express                         |
| Banco          | PostgreSQL                                |
| Proxy / TLS    | Nginx                                     |
| Containers     | Docker Compose                            |
| Testes         | Vitest · React Testing Library · Playwright |

A aplicação roda **inteira em uma única VPS Ubuntu**. Não há microserviços nem
arquitetura distribuída. Esse é um teto deliberado: até o ponto em que ele
for realmente um problema, evitamos a complexidade.

---

## 3. Arquitetura

```
[ Frontend (PWA) ]
        │  HTTPS
        ▼
    [ Nginx ]
        │
        ├──► /api/*  ─►  [ Express REST ]
        │                       │
        │                       ▼
        │               [ PostgreSQL ]
        │
        └──► /socket.io/* ─► [ Express + Socket.IO ]
                                       │
                                       ▼
                               [ PostgreSQL ]
```

- **REST** para tudo que é idempotente, persistente e fácil de versionar.
- **Socket.IO** para estado efêmero da sala: chat, dados, posições no mapa,
  presença de jogadores.
- **PostgreSQL** é a única fonte de verdade persistente.

### Fluxo de uma sala

1. O mestre cria a sala via `POST /api/rooms` (REST).
2. O backend persiste a sala e devolve um `roomId` + `code`.
3. O cliente abre a conexão Socket.IO e emite `room:join`.
4. Toda interação realtime passa por eventos Socket.IO roteados em
   `backend/src/sockets/handlers/`.
5. Mensagens, rolagens, fichas e metadados do mapa são espelhados no banco
   para histórico e recuperação.

---

## 4. Estrutura de pastas

### Frontend (`/frontend`)

```
src/
├── components/      componentes reutilizáveis
├── contexts/        providers globais (auth, socket, room)
├── hooks/           hooks de domínio
├── pages/           rotas de alto nível
│   ├── Home
│   ├── CreateRoom
│   ├── JoinRoom
│   ├── Room
│   ├── Sheet
│   └── NotFound
├── routes/          definição de rotas (React Router)
├── services/        clientes HTTP e Socket.IO
├── stores/          estado local/derivado
├── styles/          tema e estilos globais
├── types/           tipos compartilhados
└── utils/           funções puras
```

### Backend (`/backend`)

```
src/
├── controllers/     endpoints REST por domínio
│   ├── auth.controller.ts
│   ├── room.controller.ts
│   ├── message.controller.ts
│   ├── dice.controller.ts
│   ├── sheet.controller.ts
│   ├── map.controller.ts
│   └── mapToken.controller.ts
├── services/        regras de negócio e acesso a dados
├── routes/
│   └── api.ts       roteador raiz (/api/*)
├── middlewares/     auth, erros, upload
├── sockets/
│   ├── index.ts     bootstrap do servidor Socket.IO
│   ├── auth.ts      handshake autenticado
│   ├── room-state.ts
│   ├── state.ts
│   ├── ioRef.ts
│   └── handlers/    handlers por evento
│       ├── chat.handler.ts
│       ├── dice.handler.ts
│       ├── room.handler.ts
│       ├── map.handler.ts
│       ├── mapToken.handler.ts
│       └── turn.handler.ts
├── database/        conexão, migrations e seeds
├── types/           tipos de domínio
└── utils/           helpers puros
```

### Top-level

```
chilli/
├── backend/
├── frontend/
├── infra/            Nginx, scripts de provisionamento
├── scripts/          utilitários de manutenção
├── secrets/          arquivos .env (fora do git)
├── docker-compose.yml
├── docker-compose.frontend.yml
├── docker-compose.postgres.yml
├── docker-compose.staging.yml
├── docker-compose.prod.yml
└── DEPLOY.md
```

---

## 5. API REST

Roteador raiz: `backend/src/routes/api.ts`.

| Prefixo                  | Responsabilidade                              |
|--------------------------|-----------------------------------------------|
| `/api/auth/*`            | Registro, login, refresh                      |
| `/api/rooms/*`           | CRUD de salas, histórico de mensagens/dados   |
| `/api/rooms/:id/messages` | Chat                                          |
| `/api/rooms/:id/dice`     | Histórico de rolagens                         |
| `/api/rooms/:id/sheets`   | Fichas (estrutura JSON)                       |
| `/api/rooms/:id/map`      | Upload e metadados do mapa                    |
| `/api/rooms/:id/map-tokens`| Tokens sobre o mapa                          |
| `/api/characters/:id`     | PATCH da ficha de um personagem               |
| `/api/health`             | Healthcheck                                   |

### Princípios

- **Versionamento por prefixo** — `/api/v1/...` quando quebrarmos contrato.
- **Validação na borda** — controllers validam entrada; service confia.
- **Erros tipados** — middleware de erro converte para HTTP status adequado.
- **Auth via cookie HTTP-only** + JWT; handshake do Socket.IO reusa o mesmo
  mecanismo.

---

## 6. Socket.IO

Namespace padrão. Eventos organizados por **domínio** em
`backend/src/sockets/handlers/`. Cada handler:

1. Valida o payload.
2. Aplica a mutação no banco (se houver).
3. Faz broadcast para a sala correspondente.

### Eventos principais (MVP)

| Evento              | Direção      | Descrição                          |
|---------------------|--------------|------------------------------------|
| `room:join`         | cliente→srv  | Entrar na sala                     |
| `room:leave`        | cliente→srv  | Sair da sala                       |
| `room:state`        | srv→cliente  | Snapshot inicial da sala           |
| `chat:message`      | bi-direcional| Mensagem de chat                   |
| `dice:roll`         | bi-direcional| Rolagem de dado                    |
| `map:update`        | bi-direcional| Zoom/pan do mapa                   |
| `map:token:move`    | bi-direcional| Movimento de token no mapa         |
| `turn:change`       | bi-direcional| Troca de turno                     |

### Autenticação

O handshake exige um JWT válido. A implementação vive em
`backend/src/sockets/auth.ts`. Conexões sem token válido são rejeitadas com
`DisconnectReason`.

---

## 7. Modelo de dados (resumo)

> Tabelas e colunas definitivas ficam em `backend/src/database/migrations/`.
> Esta seção é a **intenção de modelo**, não o schema literal.

- **users** — `id`, `name`, `email`, `password_hash`, `avatar_url`.
- **rooms** — `id`, `code`, `name`, `owner_id`, `map_url`, `created_at`.
- **room_members** — `room_id`, `user_id`, `role` (gm/player), `joined_at`.
- **characters** — `id`, `room_id`, `owner_id`, `sheet_json`.
- **messages** — `id`, `room_id`, `user_id`, `body`, `created_at`.
- **dice_rolls** — `id`, `room_id`, `user_id`, `expression`, `result`,
  `details_json`, `created_at`.
- **map_tokens** — `id`, `room_id`, `x`, `y`, `label`, `owner_id`.

`sheet_json` é **flexível por design**: o MVP não conhece sistemas de RPG.
Cada mesa define a estrutura que quer usar.

---

## 8. Mobile First

Diretriz de UI:

1. Desenhar primeiro para **390 px** (iPhone 12/13/14 largura lógica).
2. Adaptar para tablet (≥ 768 px) e desktop (≥ 1024 px).
3. Toda interação crítica deve ser alcançável com o polegar.
4. Áreas de toque mínimas de 44 × 44 px.

Navegação principal vive em uma **bottom bar** no mobile. No desktop, a
mesma navegação migra para uma **side rail** fixa.

---

## 9. PWA

O Chilli é distribuído como PWA. O usuário pode:

- Abrir pela web.
- Instalar no Android (Chrome → "Adicionar à tela inicial").
- Instalar no iPhone (Safari → Compartilhar → "Adicionar à tela inicial").

Sem Play Store ou App Store no MVP. Service Worker registra-se em
produção; em desenvolvimento ele fica desligado para não interferir com
HMR.

---

## 10. Configuração e segredos

Variáveis de ambiente vivem em `secrets/`, **fora do git**. Cada
ambiente tem seu próprio arquivo (`postgres.env`, `backend.env`,
`frontend.env`).

| Variável              | Onde                | Descrição                          |
|-----------------------|---------------------|------------------------------------|
| `DB_HOST`             | backend             | Host do Postgres (container)       |
| `DB_PORT`             | backend             | 5432                               |
| `DB_NAME`             | backend             | `chilli` / `chilli_staging`        |
| `DB_USER`             | backend             | usuário do banco                   |
| `DB_PASSWORD`         | backend             | senha do banco                     |
| `JWT_SECRET`          | backend             | segredo dos tokens                 |
| `VITE_API_URL`        | frontend            | URL pública do backend             |
| `VITE_SOCKET_URL`     | frontend            | URL pública do Socket.IO           |

---

## 11. Execução local

Pré-requisitos: Node 20+, Docker, Docker Compose.

```bash
# Subir Postgres
docker compose -f docker-compose.postgres.yml up -d

# Backend
cd backend
cp ../secrets/backend.env.example .env
npm install
npm run db:migrate
npm run dev

# Frontend (em outro terminal)
cd ../frontend
cp ../secrets/frontend.env.example .env
npm install
npm run dev
```

Backend: `http://localhost:3000` · Frontend: `http://localhost:5173`.

---

## 12. Testes

Ferramentas oficiais: **Vitest** (unit/integration), **React Testing
Library** (componentes) e **Playwright** (E2E).

### Fluxos obrigatórios (E2E)

- Criar mesa.
- Entrar em mesa (por link e por código).
- Chat entre dois clientes.
- Rolagem de dados com expressão customizada.
- Upload e manipulação de mapa.

### Comandos

```bash
# Backend
cd backend && npm test            # vitest run
cd backend && npm run test:watch  # watch mode
cd backend && npm run test:coverage

# Frontend
cd frontend && npm test
cd frontend && npm run e2e        # playwright
```

### Regra de bug

> Toda correção de bug **deve incluir um teste** que falha antes do fix
> e passa depois. Sem exceção.

---

## 13. Processo de desenvolvimento

Sequência oficial para cada feature:

1. **Modelagem** — esboçar tipos, contratos, modelo de dados.
2. **Backend** — services e controllers, com testes.
3. **API** — confirmar contrato HTTP e validações.
4. **Socket.IO** — eventos realtime e sincronização.
5. **Interface** — UI mobile-first, com estados vazios/erro/loading.
6. **Refinamento visual** — ajustes de espaçamento, tipografia, gestos.

---

## 14. Deploy e ambientes

Três ambientes: **development** (local), **staging** e **production**.

```
feature/*  ─►  staging  ─►  main
```

- **Deploy direto em produção é proibido.** Tudo passa por staging.
- Cada stack (staging/prod) tem sua própria rede Docker, seu próprio
  backend e frontend; staging e prod compartilham o mesmo Postgres mas
  usam databases separados (`chilli_staging` e `chilli`).
- O procedimento operacional completo está em `DEPLOY.md`.

### Portas

- **Prod**: Nginx em 80/443. Backend interno em 3000.
- **Staging**: Nginx em 8080/8443. Backend interno em 3000.
- **TLS**: self-signed no MVP (browser avisa, usuário avança). Substituir
  por certificado real (Let's Encrypt) antes de abrir para público.

### Backups

`pg_dump` diário em `secrets/../backups/<YYYY-MM-DD>/`. Script vive em
`scripts/`. Retenção: 14 dias.

---

## 15. Qualidade de código

Regras do projeto:

- **TypeScript estrito**. Sem `any`. Sem `@ts-ignore` sem justificativa.
- **Interfaces tipadas** em todas as fronteiras de módulo.
- **Componentes pequenos** — se passou de 150 linhas, quebre.
- **Funções pequenas** — uma coisa bem feita por função.
- **Código legível** — o nome deve eliminar a necessidade de comentário;
  comentário é para o *porquê*, não o *o quê*.

Linter: ESLint com preset do projeto. Formatter: Prettier. Rodar antes
de cada commit:

```bash
npm run lint
npm run typecheck
```

---

## 16. O que **não** está no MVP

Para evitar derrapagem de escopo, o Chilli deliberadamente **não**
implementa:

- IA (NPCs, geração de texto, etc.).
- Voz.
- Vídeo.
- Marketplace.
- Plugins.
- Sistemas específicos de RPG (D&D, Pathfinder, etc.).
- Fog of War.
- Sistema de combate.
- Economia virtual.

Se uma feature pedida cair em uma dessas categorias, o caminho é
registrar e reavaliar **depois** do MVP.

---

## 17. Princípio-guia para mudanças

Antes de sugerir qualquer solução nova, responda:

1. **Resolve um problema real?**
2. **É necessária para o MVP?**
3. **Existe uma solução mais simples?**

Se existir uma alternativa mais simples, ela vence. Esse é o filtro
final para qualquer PR.
