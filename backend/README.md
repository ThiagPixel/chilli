# Chilli — Backend

Backend do Chilli (RPG de mesa online). Este é o **passo 2** do processo: fundação + DB + services + bootstrap HTTP mínimo (`/health`). Rotas REST de negócio e Socket.IO vêm nos passos 3 e 4.

## Stack

- Node 20 + TypeScript estrito (`noUncheckedIndexedAccess`)
- Express 4 (com health check, request id, request logger, error handler)
- Socket.IO 4 (dependência instalada, integração no passo 4)
- PostgreSQL 16 (driver `pg`, sem ORM)
- Pino (logger estruturado; `pino-pretty` em dev)
- Zod (validação de env)
- Vitest (testes) + Supertest (testes HTTP)

## Setup local

### Opção A — Docker Compose (recomendado)

A partir da raiz do monorepo (`chilli/`):

```bash
docker compose up -d db          # sobe Postgres
docker compose run --rm backend db:migrate
docker compose up backend         # sobe o backend com hot-reload
```

O backend escuta em `http://localhost:3000`.

### Opção B — local sem Docker

```bash
# 1. Postgres (qualquer instalação 16+)
psql -U postgres -c "CREATE USER chilli WITH PASSWORD 'chilli';"
psql -U postgres -c "CREATE DATABASE chilli OWNER chilli;"

# 2. Backend
cd backend
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Sobe o `server.ts` em watch mode. |
| `npm run build` | Compila TS para `dist/`. |
| `npm start` | Roda o build de produção. |
| `npm run db:migrate` | Aplica migrations pendentes. |
| `npm test` | Roda a suíte Vitest. |
| `npm run test:coverage` | Cobertura. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | ESLint. |

## Endpoints disponíveis

| Método | Path | Descrição |
|---|---|---|
| GET | `/health` | Liveness/readiness. 200 com `db: 'ok'` ou 503 com `db: 'down'`. |

Demais rotas REST entram no **passo 3 (API)**.

## Estrutura

```
src/
├── app.ts                 # factory do Express
├── server.ts              # bootstrap HTTP
├── config/                # env validation (zod)
├── controllers/           # handlers HTTP
├── database/
│   ├── connection.ts      # pool pg + withTx
│   ├── migrate.ts         # runner de migrations
│   ├── migrations/        # arquivos .sql numerados
│   └── repositories/      # SQL explícito, sem ORM
├── middlewares/           # requestId, requestLogger, errorHandler
├── services/              # regras de negócio (puras, sem express)
├── types/                 # domain + http + socket-events
├── utils/                 # logger, jwt, errors, code, hash
└── test/                  # setup + helpers + unit
```

## Modelo de dados (entidades)

Alinhado à modelagem aprovada:
- `users(id, name, email UNIQUE, avatar_url, created_at, updated_at)`
- `rooms(id, code CHAR(8) UNIQUE, name, description, master_id, status, ...)`
- `room_members(id, room_id, user_id, role, joined_at, left_at)` — único ativo por (room, user)
- `messages(id, room_id, user_id NULL, type, content, ...)`
- `dice_rolls(id, room_id, user_id, expression, rolls JSONB, modifier, total, ...)`
- `characters(id, room_id, user_id, name, data JSONB, ...)` — UNIQUE(room, user)
- `maps(id, room_id, name, image_url, width, height, is_active, ...)` — único ativo por sala

Detalhes em `src/database/migrations/0001_init.sql`.

## Princípios do projeto

- **Sem `any`**: TypeScript estrito.
- **Sem ORM**: SQL explícito em `repositories/`.
- **Services sem `express` ou `socket.io`**: testáveis e reusáveis.
- **Erros tipados**: `AppError`, `NotFoundError`, `ConflictError`, etc. — convertidos em JSON pelo `errorHandler`.
- **Poucas dependências**: Express, pg, pino, zod, jsonwebtoken, bcrypt, multer, socket.io, supertest.

## Próximos passos

- **Passo 3**: `routes/`, controllers de negócio, auth middleware.
- **Passo 4**: handlers Socket.IO (`room:join`, `chat:send`, `dice:roll`, `map:state`).
- **Passo 5**: frontend.
- **Passo 6**: deploy (Nginx + produção + TLS).
