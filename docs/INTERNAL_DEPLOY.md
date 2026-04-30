# Internal deployment runbook

> **Audience: maintainers only.** This is the runbook for deploying the
> official hosted RackSmith service. It is **not** a self-host quick-start
> for end users — RackSmith v1 is hosted-only. The repo is public for
> transparency, but Pro/Business features only run on the official hosted
> service. See [`README.md`](../README.md) for context.

A step-by-step guide for running RackSmith on the official hosted infrastructure
(currently `prizmo`). The mechanics below also work for any contributor who
wants to run a production-shaped build locally for testing — just don't ship
the result as a public service.

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

# ─── Stripe billing (required for Pro/Business tiers) ──
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_PRO_MONTHLY="price_..."
STRIPE_PRICE_PRO_ANNUAL="price_..."
STRIPE_PRICE_BUSINESS_MONTHLY="price_..."
STRIPE_PRICE_BUSINESS_ANNUAL="price_..."
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

## 6. Configure Stripe billing

Pro and Business tiers run on Stripe Checkout (hosted) + Stripe Customer
Portal (hosted). RackSmith never touches a card number — Stripe handles
the entire payment surface server-side at their domain.

You'll need a [Stripe account](https://dashboard.stripe.com/) with a
verified business profile (Stripe blocks live-mode payouts otherwise).

### 6.1. Create the product + 4 prices

In **Test mode** first (`Stripe Dashboard → toggle "Test mode" on`):

1. **Products → Add product → Name: `RackSmith Pro`**
   - Add price: $9.00 USD, recurring monthly → save the `price_...` ID into `STRIPE_PRICE_PRO_MONTHLY`
   - Add another price on the same product: $90.00 USD, recurring yearly → `STRIPE_PRICE_PRO_ANNUAL`
2. **Products → Add product → Name: `RackSmith Business`**
   - Add price: $29.00 USD, recurring monthly, **per-unit** (Pricing model: "Standard pricing", Billing units: "Per unit") → `STRIPE_PRICE_BUSINESS_MONTHLY`
   - Add price: $290.00 USD, recurring yearly, per-unit → `STRIPE_PRICE_BUSINESS_ANNUAL`

The per-unit pricing is critical for Business — RackSmith pushes the seat
count to Stripe via `subscriptionItems.update` whenever members are
added or removed.

### 6.2. Enable Stripe Tax (required)

**Settings → Tax → Activate**. Without this, `automatic_tax: enabled`
in the checkout session will throw at runtime. RackSmith requires
`billing_address_collection: "required"` so Stripe has the address it
needs to compute tax.

### 6.3. Configure the Customer Portal

**Settings → Billing → Customer portal → Activate**. Recommended:

- ☑ Allow customers to update payment methods
- ☑ Allow customers to update billing addresses
- ☑ Allow customers to view invoices
- ☑ Allow customers to cancel subscriptions
- ☐ Allow customers to switch plans — leave OFF until you're confident in the post-switch flow (RackSmith handles plan flips via webhook, but the UX is cleaner if switches go through Checkout)
- Set the **Headline** and the **Privacy / Terms** links to your hosted URL

### 6.4. Webhook endpoint

**Developers → Webhooks → Add endpoint**:

- Endpoint URL: `https://racksmith.yourdomain.com/api/webhooks/stripe`
- Events to send (exactly these 6):
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `invoice.payment_succeeded`
  - `charge.refunded`
- API version: `2026-04-22.dahlia` (matches the SDK pin in `src/lib/stripe.ts`)

After creating, click **Reveal signing secret** and paste into
`STRIPE_WEBHOOK_SECRET`. The webhook handler verifies every event with
this secret — without it, every webhook returns 400.

### 6.5. Get the secret key

**Developers → API keys → Reveal test key** (or live, see §6.7) → paste
into `STRIPE_SECRET_KEY`. Restricted keys also work as long as they have
write access to Customers, Subscriptions, Subscription items, Checkout
Sessions, Billing portal sessions, and Invoices.

### 6.6. Local development with Stripe CLI

To test webhooks against your local dev server without exposing it
publicly:

```bash
# Install once
brew install stripe/stripe-cli/stripe

# Sign in (opens browser)
stripe login

# Forward webhooks to local — `stripe listen` prints a `whsec_...` to
# paste into your dev .env's STRIPE_WEBHOOK_SECRET
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal, trigger an event
stripe trigger customer.subscription.created
```

The CLI's signing secret is different from the dashboard one — keep
them straight. Dev `.env` uses the CLI's; prod `.env.prod` uses the
dashboard endpoint's.

### 6.7. Going live

When ready to take real money:

1. **Toggle "Test mode" off in the Stripe dashboard** and repeat §6.1–§6.4 in **Live mode** — products, prices, portal config, and webhook endpoint are scoped per mode and don't carry over
2. Confirm every live-mode key has the right prefix:
   - `STRIPE_SECRET_KEY` starts with `sk_live_` (NOT `sk_test_`)
   - `STRIPE_WEBHOOK_SECRET` starts with `whsec_`
   - All four `STRIPE_PRICE_*` IDs come from live-mode products
3. Update `.env.prod` with the live values, then restart the app:
   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d app
   ```
4. Run a real upgrade with your own card → verify the charge appears in
   the Live mode dashboard → cancel from the customer portal → verify
   the downgrade fires via webhook → optionally refund the charge from
   the dashboard and verify the audit log row

If anything in the flow misbehaves, the `StripeEvent` table in Postgres
is the source of truth for what arrived, what was processed, and what
errored — `SELECT id, type, processedAt, errorMessage FROM "StripeEvent"
ORDER BY "createdAt" DESC LIMIT 20;` is the first stop for debugging.

---

## 7. Configure email delivery

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

## 8. Backups

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

## 9. Upgrades

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

## 10. Troubleshooting

| Symptom | Likely cause |
|---|---|
| `/api/health` returns `503` | Postgres is unreachable — check `docker compose logs db` |
| OAuth redirect returns "Invalid origin" | `BETTER_AUTH_URL` doesn't match the public URL |
| Reset emails never arrive | `RESEND_API_KEY` unset or sender domain unverified — check `docker logs app` for the dev-mode logger output |
| 429 on login | You hit the default 5/15-min rate limit — wait it out or tune `customRules` in `src/lib/auth.ts` |
| Session lost after reverse-proxy change | The cookie domain changed; users need to sign in again |
| Multi-instance deployment skipping rate limits | Rate-limit storage is in-memory — switch to `storage: "database"` in `auth.ts` and add a `RateLimit` Prisma model |
| Checkout button fails with "Server is missing BETTER_AUTH_URL" | `.env.prod` is missing the var, or you forgot to restart the app after adding it |
| Webhook returns 400 "Signature verification failed" | `STRIPE_WEBHOOK_SECRET` doesn't match the endpoint Stripe is hitting. In dev, the CLI's secret is different from the dashboard's |
| All Stripe events sit in `StripeEvent` with `errorMessage = "No organization for customer ..."` | Customer was created in the Stripe dashboard manually, not via Checkout. The webhook can't link it to an org |
| Business org's Stripe quantity drifts from member count | Look at `Member` count vs `subscriptionItem.quantity` in the dashboard. The post-accept reconcile is best-effort; restart sync by removing+re-adding any member, or call `syncSeatsForOrgStandalone` from a one-off script |
| Live-mode test charges show `_test_` prefixes | `.env.prod` still points at test-mode keys. Verify all six STRIPE_* vars use live values, then restart the app |

File an issue at <https://github.com/nindroid-systems/racksmith/issues>
if you hit something that isn't covered here.
