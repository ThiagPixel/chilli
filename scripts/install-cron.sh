#!/usr/bin/env bash
# ============================================================================
# Chilli — instala crontab para backups e manutenção.
#
# Adiciona (idempotente — remove entradas antigas antes):
#   - Backup diário do Postgres às 03:00
#   - Prune de imagens Docker na segunda às 04:00
#   - Renew do cert Let's Encrypt no dia 1 de cada mês às 05:00
#     (envia SIGHUP ao nginx-prod para recarregar; sem reiniciar Docker)
#
# Uso:  sudo ./scripts/install-cron.sh
# ============================================================================
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "ERRO: rode como root."
  exit 1
fi

CRON_FILE="/etc/cron.d/chilli"
TMP=$(mktemp)

cat > "$TMP" <<'EOF'
# Chilli — tarefas agendadas.
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# m h dom mon dow user command
# Backup diário do Postgres.
0 3 * * *   root   /srv/chilli/app/scripts/backup-postgres.sh >> /srv/chilli/logs/backup.log 2>&1

# Prune de imagens Docker antigas (seg 04:00).
0 4 * * 1   root   docker image prune -af --filter "until=168h" >> /srv/chilli/logs/prune.log 2>&1

# Renew do cert Let's Encrypt (dia 1/mês às 05:00).
# O script emite o cert e dá SIGHUP no chilli-nginx-prod para recarregar.
0 5 1 * *   root   /srv/chilli/app/scripts/renew-letsencrypt.sh >> /srv/chilli/logs/renew.log 2>&1
EOF

install -m 644 "$TMP" "$CRON_FILE"
rm "$TMP"

echo "OK. Crontab instalado em $CRON_FILE"
echo "Ative com: systemctl enable --now cron"
crontab -l 2>/dev/null || true
