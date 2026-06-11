# Chilli — Deploy

> Como subir staging e produção nesta VPS, de forma segura e reproduzível.

## Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│  VPS Ubuntu                                                  │
│                                                              │
│  /srv/chilli/                                                │
│  ├── app/                       ← git clone do repo          │
│  ├── secrets/postgres.env       ← DB_USER, DB_PASSWORD       │
│  ├── backups/<YYYY-MM-DD>/      ← pg_dump diário             │
│  └── logs/                                                  │
│                                                              │
│  Docker networks:                                            │
│  ├── chilli_data_net            (reservada p/ serviços       │
│  │                               compartilhados futuros)     │
│  ├── chilli_prod_net            (postgres + stack prod)      │
│  └── chilli_staging_net         (postgres + stack staging)   │
│                                                              │
│  Stack prod (portas 80/443):                                 │
│  ├── chilli-postgres            (sem porta publicada)        │
│  ├── chilli-backend-prod        (3000 interno)               │
│  ├── chilli-frontend-prod       (80 interno)                 │
│  └── chilli-nginx-prod          (80/443 externos)            │
│                                                              │
│  Stack staging (portas 8080/8443):                           │
│  ├── (mesmo postgres, DB chilli_staging)                     │
│  ├── chilli-backend-staging     (3000 interno)               │
│  ├── chilli-frontend-staging    (80 interno)                 │
│  └── chilli-nginx-staging       (8080/8443 externos)         │
└──────────────────────────────────────────────────────────────┘
```

Acesso:
- **Prod**: `https://<VPS_IP>/` (self-signed — browser avisa, clique em "avançar")
- **Staging**: `https://<VPS_IP>:8443/`
- Health do backend: `https://<VPS_IP>/api/health` e `https://<VPS_IP>:8443/api/health`

## Primeiro deploy (one-time)

### 1. Setup da VPS

```bash
# Conectar como root.
ssh root@<VPS_IP>

# Clonar o repo.
git clone <REPO_URL> /srv/chilli/app
cd /srv/chilli/app

# Setup one-time (UFW, fail2ban, deploy user, redes Docker).
sudo ./scripts/setup-vps.sh
```

### 2. Configurar deploy por chave SSH

```bash
# Local (na sua máquina): gere uma chave de deploy.
ssh-keygen -t ed25519 -C "chilli-deploy"

# Copie a chave pública para a VPS.
ssh-copy-id -i ~/.ssh/id_ed25519.pub chilli-deploy@<VPS_IP>
```

A partir daqui, todos os comandos rodam como `chilli-deploy`:

```bash
sudo -u chilli-deploy -i
cd /srv/chilli/app
```

### 3. Gerar secrets

```bash
# Senha do Postgres (mesma para prod e staging).
openssl rand -base64 32

# JWT secrets (DIFERENTES para prod e staging).
openssl rand -base64 48  # guarde este para prod
openssl rand -base64 48  # guarde este para staging
```

### 4. Preencher os .env

```bash
# Postgres
sudo install -m 600 -o chilli-deploy -g chilli-deploy \
  /dev/null /srv/chilli/secrets/postgres.env
sudo -u chilli-deploy nano /srv/chilli/secrets/postgres.env
# Conteúdo (substitua CHANGE_ME):
#   POSTGRES_USER=chilli
#   POSTGRES_PASSWORD=<saída do passo 3>
#   POSTGRES_DB=chilli

# Backend prod
cp /srv/chilli/app/backend/.env.prod.example /srv/chilli/app/backend/.env.prod
chmod 600 /srv/chilli/app/backend/.env.prod
nano /srv/chilli/app/backend/.env.prod
# Troque: DATABASE_URL (coloque a senha), JWT_SECRET

# Backend staging
cp /srv/chilli/app/backend/.env.staging.example /srv/chilli/app/backend/.env.staging
chmod 600 /srv/chilli/app/backend/.env.staging
nano /srv/chilli/app/backend/.env.staging
# Troque: DATABASE_URL (mesma senha, DB = chilli_staging), JWT_SECRET (diferente!)
```

### 5. Gerar certs TLS

```bash
cd /srv/chilli/app
sudo -u chilli-deploy ./infra/generate-certs.sh <VPS_IP>
```

### 6. Subir o postgres

```bash
cd /srv/chilli/app
sudo -u chilli-deploy \
  docker compose -p chilli-data \
  -f docker-compose.postgres.yml \
  --env-file /srv/chilli/secrets/postgres.env \
  up -d

# Verificar
sudo -u chilli-deploy docker ps
# Deve mostrar chilli-postgres com status "healthy" em ~30s
```

### 7. Deploy de staging

```bash
cd /srv/chilli/app
sudo -u chilli-deploy ./scripts/deploy.sh staging

# Verificar
sudo -u chilli-deploy docker ps
# 4 containers: postgres, backend, frontend, nginx — todos healthy

# Smoke test
curl -k https://<VPS_IP>:8443/api/health
# Esperado: {"status":"ok","db":"ok",...}
curl -k https://<VPS_IP>:8443/ | head -20
# Esperado: HTML com <div id="root">
```

### 8. Deploy de prod

```bash
# Promover staging → main.
# No seu repo local:
git checkout main
git pull
git merge --no-ff origin/staging -m "promote: staging → main"
git push origin main

# Na VPS, fazer pull e deploy.
ssh chilli-deploy@<VPS_IP>
cd /srv/chilli/app
git checkout main
git pull --ff-only origin main
./scripts/deploy.sh prod
```

### 9. Ativar crons

```bash
# Como root na VPS.
sudo /srv/chilli/app/scripts/install-cron.sh
```

## Fluxo do dia-a-dia

```bash
# 1. Desenvolver em feature branch.
git checkout -b feature/minha-mudanca
# ... commits ...
git push origin feature/minha-mudanca

# 2. PR: feature → staging. Após merge, deploy em staging.
ssh chilli-deploy@<VPS_IP>
cd /srv/chilli/app && git checkout staging && git pull
./scripts/deploy.sh staging

# 3. Smoke test em https://<VPS_IP>:8443/

# 4. PR: staging → main. Após merge, deploy em prod.
cd /srv/chilli/app && git checkout main && git pull
./scripts/deploy.sh prod

# 5. Smoke test em https://<VPS_IP>/
```

## Rollback

```bash
ssh chilli-deploy@<VPS_IP>
cd /srv/chilli/app

# Imagens antigas ficam no cache do Docker até o prune semanal.
# Para reverter, basta checkout do commit anterior:
git log --oneline -5  # pegue o SHA do commit anterior
git checkout <SHA_ANTERIOR>
./scripts/deploy.sh prod

# Para o banco: se a migration do commit que você está revertendo
# for destrutiva, restaure o backup ANTES de subir a app antiga:
ls /srv/chilli/backups/  # escolha o dia anterior
docker exec -i chilli-postgres psql -U chilli -d chilli < \
  /srv/chilli/backups/<DATA>/chilli.sql
```

## Backup e restore

Backup diário automático às 03:00 em `/srv/chilli/backups/<DATA>/`.

Restore manual:

```bash
# Restaurar DB prod do backup de uma data específica.
gunzip -c /srv/chilli/backups/2025-12-31/chilli.sql.gz \
  | docker exec -i chilli-postgres psql -U chilli -d chilli

# Uploads: a partir de /srv/chilli/uploads_prod no volume Docker.
docker run --rm -v chilli-prod_chilli_uploads_prod:/data \
  -v /srv/chilli/backups/uploads/2025-12-31:/backup:ro \
  alpine cp -a /backup/. /data/
```

## Segurança

| Item | Onde | Como auditar |
|---|---|---|
| UFW | VPS | `sudo ufw status` |
| fail2ban | VPS | `sudo fail2ban-client status sshd` |
| Postgres sem porta pública | compose | `sudo ss -tlnp \| grep 5432` (não deve aparecer) |
| Cert self-signed | VPS | `openssl x509 -in /srv/chilli/app/infra/certs/cert.pem -noout -dates` |
| Permissões dos .env | VPS | `stat -c '%a %n' /srv/chilli/app/backend/.env.*` (deve ser 600) |
| Healthcheck do backend | curl | `curl -k https://<IP>/api/health` (status: "ok") |

## Limitações conhecidas (aceitas para o MVP)

- Self-signed: browser avisa. Resolvido com domínio + Let's Encrypt.
- Mesma VPS para staging e prod: teste ruim de carga isolada. Resolvido com segunda VPS.
- Mesma instância Postgres: queda do container derruba os 2 envs. Mitigado pelo backup diário.
- Sem CDN/Cloudflare: latência para usuários distantes. Resolvido quando o tráfego justificar.
- Sem observabilidade externa: logs ficam em `/srv/chilli/logs/`. Resolvido com Vector/Loki ou similar.
- Sem alta disponibilidade: 1 VPS. Mitigado por backup automatizado.
