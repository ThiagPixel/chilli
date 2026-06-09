# ===========================================================================
# Chilli — frontend Dockerfile (multi-stage).
#
# Estágio 1 (build): instala deps, roda typecheck + Vite build, gera dist/.
# Estágio 2 (runtime): Nginx alpine servindo o bundle estático.
# ===========================================================================

# ---------- build ----------
FROM node:20-alpine AS build
WORKDIR /app

# Instala deps em camada separada para melhor cache.
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

# Copia o resto e builda.
COPY tsconfig.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
RUN npm run build

# ---------- runtime ----------
FROM nginx:1.27-alpine AS runtime

# Config do Nginx servindo SPA estática.
COPY <<'EOF' /etc/nginx/conf.d/default.conf
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  # SPA — qualquer rota cai no index.html.
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Healthcheck endpoint.
  location = /healthz {
    add_header Content-Type text/plain;
    return 200 'ok';
  }

  # Cache longo para assets com hash; nada para o index.
  location ~* \.(?:js|css|woff2?|svg|png|jpg|jpeg|webp|ico)$ {
    expires 30d;
    add_header Cache-Control "public, immutable";
    try_files $uri =404;
  }

  # Compressão básica.
  gzip on;
  gzip_types text/css application/javascript image/svg+xml application/json;
  gzip_min_length 1024;
}
EOF

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
