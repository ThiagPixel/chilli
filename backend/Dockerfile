# Multi-stage build para o backend do Chilli.
# Imagem final: distroless-like (Node 20 Alpine) com código compilado.

# ---- 1. Build deps
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=optional || npm install

# ---- 2. Build
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- 3. Runtime
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Apenas o necessário para rodar
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=deps /app/node_modules ./node_modules

# Migrations ficam em src/; precisamos delas no runtime
COPY --from=build /app/src/database/migrations ./dist/database/migrations

EXPOSE 3000
USER node

CMD ["node", "dist/server.js"]
