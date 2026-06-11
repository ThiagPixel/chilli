#!/usr/bin/env bash
# ============================================================================
# Chilli — emissão do cert Let's Encrypt (primeira vez).
#
# Usa o desafio HTTP-01 via webroot. O nginx já serve
# /.well-known/acme-challenge/ a partir de /var/www/letsencrypt
# (montado em docker-compose.prod.yml).
#
# Pré-requisitos:
#   - DNS A chilliplay.com.br       → VPS_IP (já propagado)
#   - DNS A stg.chilliplay.com.br   → VPS_IP (já propagado)
#   - Stack prod já no ar (nginx servindo :80)
#   - certbot instalado (setup-vps.sh)
#
# Uso:  sudo ./infra/issue-letsencrypt.sh
# ============================================================================
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "ERRO: rode como root ou com sudo."
  exit 1
fi

DOMAINS=(
  "chilliplay.com.br"
  "stg.chilliplay.com.br"
)

# -d é cumulativo; um único cert cobre os dois SANs.
CERTBOT_ARGS=()
for d in "${DOMAINS[@]}"; do
  CERTBOT_ARGS+=(-d "$d")
done

echo "Emitindo cert para: ${DOMAINS[*]}"
certbot certonly --webroot \
  -w /var/www/letsencrypt \
  --cert-name chilliplay \
  --agree-tos \
  --no-eff-email \
  -m chilli@chilliplay.com.br \
  "${CERTBOT_ARGS[@]}"

echo ""
echo "OK. Cert emitido em /etc/letsencrypt/live/chilliplay/"
echo "Recarregue o nginx para aplicar: docker kill -s HUP chilli-nginx-prod"
