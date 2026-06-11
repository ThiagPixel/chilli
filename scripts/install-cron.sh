#!/usr/bin/env bash
# ============================================================================
# Chilli — instala crontab para backups e manutenção.
#
# Adiciona (idempotente — remove entradas antigas antes):
#   - Backup diário às 03:00
#   - Prune de imagens Docker na segunda às 04:00
#   - Renew de certs anualmente (1/jan às 05:00)
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

# Renew de certs self-signed (1/jan às 05:00). Substitua pelo certbot se virar domínio.
0 5 1 1 *   root   /srv/chilli/app/infra/generate-certs.sh $(curl -s -m 3 ifconfig.me 2>/dev/null || echo "127.0.0.1") && /usr/bin/systemctl restart docker  >> /srv/chilli/logs/renew.log 2>&1 || true
EOF

install -m 644 "$TMP" "$CRON_FILE"
rm "$TMP"

echo "OK. Crontab instalado em $CRON_FILE"
echo "Ative com: systemctl enable --now cron"
crontab -l 2>/dev/null || true
