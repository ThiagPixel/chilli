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

# Entrypoint que ajusta o owner de $UPLOAD_DIR antes de subir o Node.
# O processo roda como root (o chown precisa de CAP_CHOWN); arquivos
# novos ficam com umask 022 → 644, legíveis pelo nginx via bind :ro.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

# Healthcheck: aceita 200 e 503 (degraded mas app up).
# start_period generoso porque o backend roda migrations no boot.
HEALTHCHECK --interval=10s --timeout=3s --start-period=60s --retries=5 \
  CMD wget -qO- http://localhost:3000/health > /dev/null || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "dist/server.js"]
