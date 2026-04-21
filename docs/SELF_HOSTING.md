# Self-hosting RackSmith

A step-by-step guide for running RackSmith on your own hardware or VPS. If
you just want to try it locally, read [`README.md`](../README.md) first —
this doc is for people running it in production.

---

## 1. What you'll need

| Requirement | Why |
|---|---|
| A Linux host with Docker 24+ and Docker Compose v2 | The stack runs as two containers: app + Postgres |
| A domain name pointed at the host | Required for OAuth redirects and HSTS |
| A reverse proxy (Caddy, nginx, Traefik) terminating TLS | Don't expose `PORT=3000` to the internet directly |
| ~1 GB RAM available for the app container | Next.js standalone + Prisma is modest but not tiny |
| Optional: a Resend account for real email | Without it, password resets and verification links print to the app container's stderr |

A small VPS (1 vCPU / 2 GB RAM / 20 GB disk) handles a single-org
deployment comfortably.

---

## 2. Prepare your environment file

Create a new `.env.prod` (don't reuse the dev `.env`):

```bash
# ─── Database ──────────────────────────────────────
POSTGRES_USER=racksmith
POSTGRES_PASSWORD="<generate a strong password>"
POSTGRES_DB=racksmith

# ─── Better Auth ──────────────────────────────────
BETTER_AUTH_SECRET="<openssl rand -hex 32>"
BETTER_AUTH_URL=https://racksmith.yourdomain.com

# ─── App ──────────────────────────────────────────
APP_PORT=3000
RACKSMITH_SEED=1          # seed the device catalog on first boot; set to 0 after

# ─── Email (optional but recommended in prod) ──────
RESEND_API_KEY=""
RACKSMITH_EMAIL_FROM="RackSmith <noreply@yourdomain.com>"

# ─── OAuth (optional) ─────────────────────────────
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

Generate the secrets fresh — never reuse them across environments:

```bash
openssl rand -hex 32   # for BETTER_AUTH_SECRET
openssl rand -hex 20   # for POSTGRES_PASSWORD
```

---

## 3. Deploy the stack

```bash
# Clone the repo on the host
git clone https://github.com/nindroid-systems/racksmith.git
cd racksmith

# Build + start (app + Postgres + healthchecks)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Watch the startup — entrypoint runs migrations and (optionally) seeds
docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f app
```

The entrypoint will:

1. Wait up to 60 s for Postgres to accept connections
2. Run `prisma migrate deploy` (applies every unapplied migration)
3. Seed the device catalog if `RACKSMITH_SEED=1` (safe to re-run)
4. Start the standalone Next.js server on port 3000

Health check once it's up:

```bash
curl http://localhost:3000/api/health
# → {"status":"ok","checks":{"database":{"ok":true},"migrations":{"ok":true,"applied":N}}}
```

After first boot, flip `RACKSMITH_SEED=0` and `docker compose up -d` again
so re-seeds don't run on every restart.

---

## 4. Put a reverse proxy in front

RackSmith binds `0.0.0.0:3000` inside its container and publishes to
`${APP_PORT}` on the host. Put Caddy / nginx / Traefik in front to
terminate TLS and forward requests. The app trusts `X-Forwarded-For` for
audit logging — make sure your proxy sets it.

### Caddyfile example

```caddy
racksmith.yourdomain.com {
  reverse_proxy localhost:3000
}
```

### nginx example

```nginx
server {
  listen 443 ssl http2;
  server_name racksmith.yourdomain.com;

  ssl_certificate     /etc/letsencrypt/live/racksmith.yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/racksmith.yourdomain.com/privkey.pem;

  location / {
    proxy_pass         http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header   Host              $host;
    proxy_set_header   X-Real-IP         $remote_addr;
    proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto $scheme;
    proxy_set_header   Upgrade           $http_upgrade;
    proxy_set_header   Connection        "upgrade";
  }
}
```

Whatever proxy you pick, make sure `BETTER_AUTH_URL` in `.env.prod` points
at the **public** HTTPS URL (not `localhost:3000`), otherwise OAuth
redirects and password-reset links will break.

---

## 5. Configure OAuth (optional)

The login and signup pages only render OAuth buttons when both provider
credentials are set. Omit both to run email-only.

### GitHub

1. Go to **Settings → Developer settings → OAuth Apps → New OAuth App**
2. Homepage URL: `https://racksmith.yourdomain.com`
3. Authorization callback URL: `https://racksmith.yourdomain.com/api/auth/callback/github`
4. Copy the Client ID + generate a Client Secret, paste into `.env.prod`

### Google

1. Open the [Google Cloud Console credentials page](https://console.cloud.google.com/apis/credentials)
2. **Create Credentials → OAuth client ID → Web application**
3. Authorized redirect URI: `https://racksmith.yourdomain.com/api/auth/callback/google`
4. Copy the Client ID + Secret into `.env.prod`

Restart the app container after editing `.env.prod`:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d app
```

---

## 6. Configure email delivery

Without `RESEND_API_KEY`, every outbound email prints to the app
container's stderr. That's fine for dev and homelabs that don't mind
grabbing reset links from `docker logs`. In production, set it:

1. Sign up at [resend.com](https://resend.com/) and verify a domain you
   control
2. Create an API key, paste into `.env.prod` as `RESEND_API_KEY`
3. Set `RACKSMITH_EMAIL_FROM` to a verified sender address
4. Restart the app

Test it by requesting a password reset — the email should land in your
inbox within seconds.

---

## 7. Backups

The app container is stateless. **All data lives in the `pgdata` Docker
volume.** If you lose that volume, you lose everything.

### Automated dumps

Run a cron from the host:

```bash
# /etc/cron.daily/racksmith-backup
#!/bin/sh
set -e
BACKUP_DIR=/var/backups/racksmith
TIMESTAMP=$(date -u +%Y-%m-%dT%H-%M-%SZ)
mkdir -p "$BACKUP_DIR"
docker compose -f /path/to/racksmith/docker-compose.prod.yml \
  --env-file /path/to/.env.prod \
  exec -T db pg_dump -U racksmith racksmith \
  | gzip > "$BACKUP_DIR/racksmith-$TIMESTAMP.sql.gz"
# Keep 14 days
find "$BACKUP_DIR" -name 'racksmith-*.sql.gz' -mtime +14 -delete
```

Ship those dumps off the host (S3, rclone, restic — whatever you already
use) — a backup on the same disk is not a backup.

### Restore

```bash
# Tear down the old data
docker compose -f docker-compose.prod.yml --env-file .env.prod down -v

# Start only postgres
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d db

# Wait for it to be healthy, then pipe the dump back in
gunzip -c backup.sql.gz | docker compose -f docker-compose.prod.yml \
  --env-file .env.prod exec -T db psql -U racksmith racksmith

# Finally start the app
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d app
```

---

## 8. Upgrades

```bash
cd racksmith
git pull
docker compose -f docker-compose.prod.yml --env-file .env.prod build app
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d app
```

Migrations run automatically on container start. If a release ships a
destructive or long-running migration, we'll call it out in
[`CHANGELOG.md`](../CHANGELOG.md) — back up before pulling.

---

## 9. Troubleshooting

| Symptom | Likely cause |
|---|---|
| `/api/health` returns `503` | Postgres is unreachable — check `docker compose logs db` |
| OAuth redirect returns "Invalid origin" | `BETTER_AUTH_URL` doesn't match the public URL |
| Reset emails never arrive | `RESEND_API_KEY` unset or sender domain unverified — check `docker logs app` for the dev-mode logger output |
| 429 on login | You hit the default 5/15-min rate limit — wait it out or tune `customRules` in `src/lib/auth.ts` |
| Session lost after reverse-proxy change | The cookie domain changed; users need to sign in again |
| Multi-instance deployment skipping rate limits | Rate-limit storage is in-memory — switch to `storage: "database"` in `auth.ts` and add a `RateLimit` Prisma model |

File an issue at <https://github.com/nindroid-systems/racksmith/issues>
if you hit something that isn't covered here.
