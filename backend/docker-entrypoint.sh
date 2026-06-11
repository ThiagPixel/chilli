#!/bin/sh
# ============================================================================
# Chilli — entrypoint do backend.
#
# Garante que o diretório de uploads é gravável. O volume `chilli_uploads_*`
# é auto-criado pelo Docker como root:root com mode 755, então sem este
# ajuste o processo não conseguiria criar subdiretórios (rooms/<code>/).
#
# O processo roda como root após o entrypoint — aceitável porque o
# container está em uma rede Docker privada e só escuta em 3000 para o
# nginx reverse-proxy. Os arquivos gravados ficam com umask 022 → 644,
# legíveis pelo nginx (que monta o mesmo volume :ro em outro container).
#
# Por que não dropamos para `node` com su-exec/gosu? O seccomp default
# do Docker bloqueia `setgroups`, e adicionar cap_add SETGID no compose
# aumenta superfície. A semântica real (acesso de leitura pelo nginx
# num bind :ro) não exige privilégios finos dentro do container.
# ============================================================================
set -eu

UPLOAD_DIR="${UPLOAD_DIR:-/uploads}"

mkdir -p "$UPLOAD_DIR"

# Ajusta o owner apenas se ainda não for 1000:1000. Idempotente.
CURRENT_OWNER=$(stat -c '%u:%g' "$UPLOAD_DIR" 2>/dev/null || echo "0:0")
if [ "$CURRENT_OWNER" != "1000:1000" ]; then
  echo "[entrypoint] ajustando owner de $UPLOAD_DIR para 1000:1000 (era $CURRENT_OWNER)"
  chown -R 1000:1000 "$UPLOAD_DIR"
fi

# Executa o CMD como root. Os arquivos novos virão com umask 022 → 644
# (legíveis por qualquer usuário, incluindo o nginx no bind-mount).
exec "$@"
