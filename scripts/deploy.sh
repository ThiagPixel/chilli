#!/usr/bin/env bash
# ============================================================================
# Chilli — deploy manual de staging ou prod.
#
# Pré-requisitos:
#   - setup-vps.sh já rodou
#   - Repo clonado em /srv/chilli/app (como chilli-deploy)
#   - .env.prod e .env.staging em /srv/chilli/app/backend/ (chmod 600)
#   - /srv/chilli/secrets/postgres.env existe
#   - Para prod: cert Let's Encrypt emitido (infra/issue-letsencrypt.sh)
#   - Para staging: certs self-signed em infra/certs/ (gerados uma vez)
#
# O script é idempotente e seguro de rodar a qualquer momento:
#   - Faz checkout da branch pedida (cria caos se rodar em branch errada)
#   - Aplica migrations (precisa do package.json ter `db:migrate:prod`)
#   - Roda smoke test em backend E frontend, com retry/backoff
#
# Uso:
#   sudo -u chilli-deploy /srv/chilli/app/scripts/deploy.sh staging
#   sudo -u chilli-deploy /srv/chilli/app/scripts/deploy.sh prod
# ============================================================================
set -euo pipefail

ENV=${1:-}
if [[ "$ENV" != "staging" && "$ENV" != "prod" ]]; then
  echo "Uso: $0 [staging|prod]"
  exit 1
fi

APP_DIR="/srv/chilli/app"
SECRETS_DIR="/srv/chilli/secrets"
LOGS_DIR="/srv/chilli/logs"
COMPOSE_FILE="$APP_DIR/docker-compose.$ENV.yml"
ENV_FILE="$APP_DIR/backend/.env.$ENV"
LOG_FILE="$LOGS_DIR/deploy-$ENV.log"

mkdir -p "$LOGS_DIR"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Garante que o volume externo que o prod nginx precisa existe.
# O compose.prod.yml declara `chilli_uploads_staging` como external e
# aponta para o volume criado pelo projeto chilli-staging. Em uma VPS
# nova, se o operador rodar `deploy.sh prod` antes de `deploy.sh staging`,
# esse volume não existe e o nginx-prod não sobe. Criamos um placeholder
# vazio para o caso de prod-before-staging — staging vai sobrescrever.
ensure_external_volume() {
  local name="$1"
  if ! docker volume inspect "$name" &>/dev/null; then
    log "criando volume externo ausente: $name"
    docker volume create "$name" >/dev/null
  fi
}

# Espera todos os serviços ficarem healthy (ou falha rápido).
# Argumentos: project name, compose file.
wait_healthy() {
  local project="$1"
  local file="$2"
  local ps_output healthy total
  for i in $(seq 1 90); do
    # Captura o output de `docker compose ps` UMA vez por iteração.
    ps_output=$(docker compose -p "$project" -f "$file" ps --format json 2>/dev/null || true)
    healthy=$(echo "$ps_output" | grep -c '"Health":"healthy"' || true)
    total=$(echo "$ps_output" | grep -c '"Service"' || true)
    log "  $healthy/$total serviços healthy"
    # Falha rápido: nenhuma linha de service significa que o compose
    # nem subiu — não vale esperar 3 min.
    if [[ "$total" -eq 0 ]]; then
      log "ERRO: nenhum serviço do projeto '$project' está rodando. Veja 'docker compose -p $project logs'."
      return 1
    fi
    if [[ "$healthy" -ge "$total" ]]; then
      log "todos os serviços healthy"
      return 0
    fi
    sleep 2
  done
  log "AVISO: nem todos os serviços ficaram healthy em 3min. Veja 'docker compose -p $project logs'."
  return 1
}

log "=== deploy $ENV iniciado ==="

# 1. Pull do código.
log "checkout $ENV..."
cd "$APP_DIR"
# Garante que estamos na branch certa antes de fazer pull. Evita o caso
# de alguém rodar `deploy.sh staging` com a working tree em outra branch
# (ex.: prod) — nesse cenário, `git pull origin staging` faz merge do
# staging na branch atual, contaminando o estado local.
if ! git show-ref --verify --quiet "refs/heads/$ENV"; then
  log "ERRO: branch local $ENV não existe. Rode 'git fetch origin && git checkout $ENV' manualmente."
  exit 1
fi
git checkout "$ENV"
git pull --ff-only origin "$ENV"
log "HEAD em $(git rev-parse --short HEAD) ($(git log -1 --pretty=%s))"

# 2. Garante que o postgres está up.
log "verificando postgres..."
docker compose -p chilli-data \
  -f "$APP_DIR/docker-compose.postgres.yml" \
  --env-file "$SECRETS_DIR/postgres.env" \
  up -d

# Aguarda postgres healthy.
log "aguardando postgres healthy..."
for i in $(seq 1 60); do
  STATE=$(docker inspect --format='{{.State.Health.Status}}' chilli-postgres 2>/dev/null || echo "none")
  if [[ "$STATE" == "healthy" ]]; then
    log "postgres healthy"
    break
  fi
  if [[ $i -eq 60 ]]; then
    log "ERRO: postgres não ficou healthy em 2min. Abortando."
    exit 1
  fi
  sleep 2
done

# 3. Pré-condições específicas do env.
if [[ "$ENV" == "prod" ]]; then
  # O prod nginx precisa que chilli-staging_chilli_uploads_staging
  # exista (mesmo que staging ainda não tenha sido deployado).
  ensure_external_volume "chilli-staging_chilli_uploads_staging"
fi

# 4. Build + up do env.
log "build + up $ENV..."
docker compose -p "chilli-$ENV" \
  -f "$COMPOSE_FILE" \
  --env-file "$ENV_FILE" \
  up -d --build

# 4b. Restart nginx para刷新 cache de DNS dos upstreams.
# nginx usa upstreams por nome DNS (`server backend:3000` no nginx.conf)
# e cacheia o IP resolvido. Quando o container do backend é recriado,
# ganha IP novo mas nginx continua mandando request pro IP antigo
# → 502 Bad Gateway até alguém reiniciar manualmente. O container do
# nginx NÃO é recriado pelo `up --build` (a config dele não mudou),
# então o cache persiste. Restart invalida o cache e refaz a resolução.
# Downtime ~2s a cada deploy — aceitável para o MVP.
log "reiniciando nginx (flush DNS cache)..."
docker compose -p "chilli-$ENV" \
  -f "$COMPOSE_FILE" \
  restart nginx

# 5. Aguarda todos os serviços healthy (fail-fast se nada subiu).
log "aguardando serviços healthy..."
wait_healthy "chilli-$ENV" "$COMPOSE_FILE"

# NOTA: migrations são aplicadas automaticamente pelo backend no boot
# (`server.ts` chama `runMigrations()` antes de subir o servidor HTTP).
# Se uma migration nova quebrar o boot, o container reinicia — visível
# em `docker logs`. Não precisamos rodar manualmente aqui.

# 6. Smoke test em duas pontas: backend (/api/health) e frontend (HTML).
# Retry com backoff porque o nginx às vezes precisa de ~5s depois do
# container ficar healthy para servir HTTPS com o cert recém-montado
# (race que já nos pegou em 2026-06-16).
if [[ "$ENV" == "staging" ]]; then
  PORT=8443
else
  PORT=443
fi

smoke_check() {
  local url="$1"
  local label="$2"
  for i in 1 2 3 4 5; do
    if curl -ksf -m 5 "$url" >/dev/null; then
      log "  smoke $label: OK"
      return 0
    fi
    log "  smoke $label: tentativa $i/5 falhou, retry em 5s..."
    sleep 5
  done
  log "  smoke $label: FALHOU após 5 tentativas"
  return 1
}

log "smoke test..."
smoke_ok=true
smoke_check "https://localhost:$PORT/api/health" "backend /api/health" || smoke_ok=false
smoke_check "https://localhost:$PORT/"           "frontend /"        || smoke_ok=false

if [[ "$smoke_ok" != "true" ]]; then
  log "ERRO: smoke test falhou. Veja logs do backend."
  docker compose -p "chilli-$ENV" -f "$COMPOSE_FILE" logs --tail=50 backend
  exit 1
fi

log "=== deploy $ENV concluído ==="
