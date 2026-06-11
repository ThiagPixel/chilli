#!/usr/bin/env bash
# ============================================================================
# Chilli — setup one-time da VPS.
#
# O que faz:
#   1. UFW (allow 22, 80, 443, 8080, 8443; deny no resto)
#   2. fail2ban (proteção brute-force SSH)
#   3. Cria usuário chilli-deploy (sem senha, sudo para docker)
#   4. Cria estrutura /srv/chilli/{app,secrets,backups,logs,certs}
#   5. Cria redes Docker externas
#
# Requer: rodar como root (ou com sudo). Idempotente.
#
# Uso:
#   sudo ./scripts/setup-vps.sh
# ============================================================================
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "ERRO: rode como root ou com sudo."
  exit 1
fi

DEPLOY_USER="chilli-deploy"
APP_DIR="/srv/chilli"
SECRETS_DIR="$APP_DIR/secrets"
BACKUPS_DIR="$APP_DIR/backups"
LOGS_DIR="$APP_DIR/logs"
APP_CODE_DIR="$APP_DIR/app"

echo "[setup] instalando pacotes..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -yqq ufw fail2ban openssl curl certbot ca-certificates

echo "[setup] UFW..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment "ssh"
ufw allow 80/tcp   comment "http prod"
ufw allow 443/tcp  comment "https prod"
ufw allow 8080/tcp comment "http staging"
ufw allow 8443/tcp comment "https staging"
ufw --force enable

echo "[setup] fail2ban..."
cat > /etc/fail2ban/jail.local <<'EOF'
[sshd]
enabled = true
port    = ssh
filter  = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime  = 3600
EOF
systemctl enable --now fail2ban

echo "[setup] usuário $DEPLOY_USER..."
if ! id "$DEPLOY_USER" &>/dev/null; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
# Sem senha; deploy é feito por chave SSH (você gera VPS_SSH_KEY_PUBLIC localmente).
usermod -aG sudo "$DEPLOY_USER"
# Deploy user pode rodar docker sem sudo.
usermod -aG docker "$DEPLOY_USER"

echo "[setup] diretórios..."
mkdir -p "$APP_DIR" "$SECRETS_DIR" "$BACKUPS_DIR" "$LOGS_DIR" "$APP_CODE_DIR/certs"
chown -R "$DEPLOY_USER:$DEPLOY_USER" "$APP_DIR"
chmod 700 "$APP_DIR"
chmod 700 "$SECRETS_DIR"

echo "[setup] redes Docker..."
docker network create chilli_data_net  2>/dev/null || echo "  chilli_data_net já existe"
docker network create chilli_prod_net  2>/dev/null || echo "  chilli_prod_net já existe"
docker network create chilli_staging_net 2>/dev/null || echo "  chilli_staging_net já existe"

echo ""
echo "OK. Próximos passos:"
echo "  1. ssh-copy-id -i ~/.ssh/id_ed25519.pub $DEPLOY_USER@<IP>"
echo "     (gere a chave com: ssh-keygen -t ed25519 -C 'chilli-deploy')"
echo "  2. Clone o repo:   sudo -u $DEPLOY_USER git clone <REPO_URL> $APP_CODE_DIR"
echo "  3. Copie os .env.example para .env.prod e .env.staging em $APP_CODE_DIR/backend/"
echo "     e o postgres.env em $SECRETS_DIR/  (todos chmod 600)"
echo "  4. Gere os certs:  sudo $APP_CODE_DIR/infra/generate-certs.sh <IP>"
echo "  5. Suba o postgres: cd $APP_DIR && sudo -u $DEPLOY_USER docker compose -p chilli-data -f $APP_CODE_DIR/docker-compose.postgres.yml --env-file $SECRETS_DIR/postgres.env up -d"
echo "  6. Deploy staging:  sudo -u $DEPLOY_USER $APP_CODE_DIR/scripts/deploy.sh staging"
echo "  7. Deploy prod:     sudo -u $DEPLOY_USER $APP_CODE_DIR/scripts/deploy.sh prod"
echo "  8. Ative os crons:  sudo $APP_CODE_DIR/scripts/install-cron.sh"
