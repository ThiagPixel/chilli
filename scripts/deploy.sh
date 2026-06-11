#!/usr/bin/env bash
# ============================================================================
# Chilli — deploy manual de staging ou prod.
#
# Pré-requisitos:
#   - setup-vps.sh já rodou
#   - Repo clonado em /srv/chilli/app (como chilli-deploy)
#   - .env.prod e .env.staging em /srv/chilli/app/backend/ (chmod 600)
#   - /srv/chilli/secrets/postgres.env existe
#   - infra/certs/ tem cert.pem e key.pem
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

log "=== deploy $ENV iniciado ==="

# 1. Pull do código.
log "git pull origin $ENV..."
cd "$APP_DIR"
git fetch origin
git checkout "$ENV"
git pull --ff-only origin "$ENV"

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

# 3. Build + up do env.
log "build + up $ENV..."
docker compose -p "chilli-$ENV" \
  -f "$COMPOSE_FILE" \
  --env-file "$ENV_FILE" \
  up -d --build

# 4. Aguarda todos os serviços healthy.
log "aguardando serviços healthy..."
for i in $(seq 1 90); do
  UNHEALTHY=$(docker compose -p "chilli-$ENV" -f "$COMPOSE_FILE" ps --format json 2>/dev/null \
    | grep -c '"Health":"(healthy)"' || true)
  TOTAL=$(docker compose -p "chilli-$ENV" -f "$COMPOSE_FILE" ps --format json 2>/dev/null \
    | grep -c '"Service"' || true)
  log "  $UNHEALTHY/$TOTAL serviços healthy"
  if [[ "$UNHEALTHY" -ge "$TOTAL" && "$TOTAL" -gt 0 ]]; then
    log "todos os serviços healthy"
    break
  fi
  if [[ $i -eq 90 ]]; then
    log "AVISO: nem todos os serviços ficaram healthy em 3min. Veja 'docker compose -p chilli-$ENV logs'."
    exit 1
  fi
  sleep 2
done

# 5. Smoke test básico.
if [[ "$ENV" == "staging" ]]; then
  PORT=8443
else
  PORT=443
fi

log "smoke test em https://localhost:$PORT/api/health..."
if curl -ksf -m 5 "https://localhost:$PORT/api/health" >/dev/null; then
  log "smoke test OK"
else
  log "AVISO: smoke test falhou. Veja logs do backend."
  docker compose -p "chilli-$ENV" -f "$COMPOSE_FILE" logs --tail=50 backend
  exit 1
fi

log "=== deploy $ENV concluído ==="
