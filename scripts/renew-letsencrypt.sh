#!/usr/bin/env bash
# ============================================================================
# Chilli — renovação do cert Let's Encrypt.
#
# Roda mensalmente via cron (install-cron.sh). Após `certbot renew`,
# envia SIGHUP ao nginx-prod para ele reler o cert do disco.
# O cert é bind-mounted de /etc/letsencrypt/live/, então um HUP basta —
# NÃO reiniciamos Docker nem os containers.
#
# Pré-requisito: cert emitido uma vez via infra/issue-letsencrypt.sh.
# ============================================================================
set -euo pipefail

LOG_PREFIX="[renew]"

log() {
  echo "$(date +'%Y-%m-%d %H:%M:%S') $LOG_PREFIX $*"
}

log "rodando certbot renew..."
if certbot renew --quiet --webroot -w /var/www/letsencrypt; then
  log "certbot renew OK"
else
  log "ERRO: certbot renew falhou"
  exit 1
fi

# SIGHUP no nginx-prod: ele relê o cert bind-mounted sem drop de conexões.
if docker inspect chilli-nginx-prod &>/dev/null; then
  log "enviando SIGHUP para chilli-nginx-prod"
  docker kill -s HUP chilli-nginx-prod
  log "nginx recarregado"
else
  log "AVISO: chilli-nginx-prod não está rodando — cert renovado, mas precisa recarregar nginx no próximo deploy"
fi

log "concluído"
