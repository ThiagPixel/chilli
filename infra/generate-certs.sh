#!/usr/bin/env bash
# ============================================================================
# Chilli — geração de cert SELF-SIGNED para staging (sem domínio).
#
# O prod usa Let's Encrypt — veja infra/issue-letsencrypt.sh. Este script
# existe apenas para o staging, que é acessado por IP (não há DNS
# propagado para stg.chilliplay.com.br localmente em algumas redes).
#
# Uso:  ./infra/generate-certs.sh <VPS_IP>
# Saída: infra/certs/cert.pem, infra/certs/key.pem
#
# Validade: 365 dias. Para renovar, basta rodar de novo.
# Os certs NÃO vão para o repo (gitignored).
# ============================================================================
set -euo pipefail

VPS_IP=${1:-}
if [[ -z "$VPS_IP" ]]; then
  echo "Uso: $0 <VPS_IP>"
  echo "Ex.: $0 203.0.113.10"
  exit 1
fi

# Validação: precisa parecer com um IPv4.
if ! [[ "$VPS_IP" =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
  echo "ERRO: '$VPS_IP' não é um IPv4 válido."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="$SCRIPT_DIR/certs"
mkdir -p "$CERT_DIR"

# Usa mktemp para a config — não persiste no disco (e portanto não
# vaza o IP no repo). O openssl lê do path e descartamos depois.
CNF=$(mktemp --suffix=.cnf)
trap 'rm -f "$CNF"' EXIT

cat > "$CNF" <<EOF
[req]
distinguished_name = req_distinguished_name
req_extensions     = v3_req
prompt             = no

[req_distinguished_name]
CN = chilli

[v3_req]
keyUsage               = critical, digitalSignature, keyEncipherment
extendedKeyUsage       = serverAuth
subjectAltName         = @alt_names

[alt_names]
IP.1 = ${VPS_IP}
DNS.1 = localhost
EOF

# NÃO silencia stderr — se openssl reclamar (ex.: IP inválido), o
# operador precisa ver a mensagem.
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERT_DIR/key.pem" \
  -out    "$CERT_DIR/cert.pem" \
  -config "$CNF"

chmod 600 "$CERT_DIR/key.pem"
chmod 644 "$CERT_DIR/cert.pem"

echo "OK. Certs self-signed gerados em $CERT_DIR"
echo "Válidos por 365 dias para IP: $VPS_IP"
echo "Verifique com: openssl x509 -in $CERT_DIR/cert.pem -noout -subject -ext subjectAltName"
echo ""
echo "ATENÇÃO: este cert é só para staging. Para prod, use ./infra/issue-letsencrypt.sh"
