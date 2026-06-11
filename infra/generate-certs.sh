#!/usr/bin/env bash
# ============================================================================
# Chilli — geração de cert self-signed com SAN para IP.
#
# Uso:  ./infra/generate-certs.sh <VPS_IP>
# Saída: infra/certs/cert.pem, infra/certs/key.pem, infra/certs/openssl.cnf
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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="$SCRIPT_DIR/certs"
mkdir -p "$CERT_DIR"

CNF="$CERT_DIR/openssl.cnf"
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

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$CERT_DIR/key.pem" \
  -out    "$CERT_DIR/cert.pem" \
  -config "$CNF" 2>/dev/null

chmod 600 "$CERT_DIR/key.pem"
chmod 644 "$CERT_DIR/cert.pem"

echo "OK. Certs gerados em $CERT_DIR"
echo "Válidos por 365 dias para IP: $VPS_IP"
echo "Verifique com: openssl x509 -in $CERT_DIR/cert.pem -noout -subject -ext subjectAltName"
