#!/usr/bin/env bash
# ============================================================================
# Chilli — backup diário do Postgres.
#
# Roda via cron (install-cron.sh). Faz pg_dump dos dois DBs para
# /srv/chilli/backups/<data>/. Retenção 7 dias.
#
# Pré-requisito: container chilli-postgres up.
# ============================================================================
set -euo pipefail

BACKUP_ROOT="/srv/chilli/backups"
LOGS_DIR="/srv/chilli/logs"
LOG_FILE="$LOGS_DIR/backup.log"
RETENTION_DAYS=7

mkdir -p "$BACKUP_ROOT" "$LOGS_DIR"

DATE=$(date +'%Y-%m-%d')
DEST="$BACKUP_ROOT/$DATE"
mkdir -p "$DEST"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=== backup $DATE iniciado ==="

# Pega senha do env.
# shellcheck disable=SC1091
source /srv/chilli/secrets/postgres.env

if ! docker inspect chilli-postgres &>/dev/null; then
  log "ERRO: container chilli-postgres não existe"
  exit 1
fi

for DB in chilli chilli_staging; do
  log "pg_dump $DB..."
  if docker exec chilli-postgres \
    pg_dump -U "$POSTGRES_USER" -d "$DB" --no-owner --clean --if-exists \
    | gzip > "$DEST/$DB.sql.gz"; then
    SIZE=$(du -h "$DEST/$DB.sql.gz" | cut -f1)
    log "  $DB OK ($SIZE)"
  else
    log "  $DB FALHOU"
    exit 1
  fi
done

# Retenção.
log "removendo backups > $RETENTION_DAYS dias..."
find "$BACKUP_ROOT" -maxdepth 1 -type d -name '20*' -mtime +$RETENTION_DAYS -exec rm -rf {} \;
REMAINING=$(find "$BACKUP_ROOT" -maxdepth 1 -type d -name '20*' | wc -l)
log "backups restantes: $REMAINING"

log "=== backup $DATE concluído ==="
