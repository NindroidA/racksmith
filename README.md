<div align="center">

# RackSmith

### Your infrastructure, beautifully documented.

Rack visualization · Device inventory · Network topology · Auto-discovery — in one modern self-hostable tool.

**NetBox is overkill. draw.io is too manual. RackSmith is the beautiful middle ground.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Bun](https://img.shields.io/badge/Bun-1.x-%23f9f1e1?logo=bun)](https://bun.sh)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript)](https://www.typescriptlang.org)
[![Prisma](https://img.shields.io/badge/Prisma-6-2d3748?logo=prisma)](https://www.prisma.io)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)](https://tailwindcss.com)
[![Status](https://img.shields.io/badge/Status-Building%20in%20private-orange)]()

![RackSmith rack builder screenshot](public/screenshots/rack-builder.png)

</div>

---

> ### ⚠️ Status: building in private
>
> RackSmith is in a **build-first, launch-later** phase. Rather than ship a
> feature-light v1.0 and iterate, we're completing the full roadmap — network
> tools, team collaboration, API, SSO, billing, paid self-host licensing —
> *before* any public launch or promotion. The tool you see once we announce
> will deliver on every pricing-page promise the day you sign up.
>
> **Authoritative plan:** [`.plans/2026-04-18/01-new-direction-full-build.md`](.plans/2026-04-18/01-new-direction-full-build.md)
> **Review framework:** [`.plans/2026-04-18/02-review-framework.md`](.plans/2026-04-18/02-review-framework.md)
>
> If you stumbled onto the repo: the code works, but **it's not being
> marketed yet.** Try it for learning or early feedback; don't expect polish
> guarantees until we post the launch announcement.

---

## What RackSmith gives you today

- **Visual rack builder** — drag devices into U-slots. Real 10.86:1 aspect ratios. Authentic brand-specific faceplates (not generic icons).
- **Device inventory** — 23 seeded enterprise devices, custom creation, CSV bulk import. Search / filter / sort with mini faceplate previews.
- **Network topology** — interactive React Flow canvas. Drag nodes, wire between handles, color-coded cables, PNG export.
- **Auto-discovery** — nmap ping-scan a subnet, review pending queue, approve / assign / ignore each discovered host.
- **Full auth stack** — email/password, GitHub/Google OAuth (optional), TOTP 2FA with backup codes + trusted devices, password reset, email verification, sessions list + sign-out-all, audit log.
- **Self-hostable** — multi-stage Dockerfile + `docker-compose.prod.yml`. `docker compose up` against a fresh Postgres deploys a working app. Migrations run on boot, seed is optional.

## Pricing model

RackSmith ships with three tiers. The **Free** tier is functional for most
homelabs. **Pro** and **Business** unlock scale + team features.

| Tier | Price | Limits |
|---|---|---|
| **Free** | $0 forever | 1 site · 3 racks · unlimited devices · full core feature set |
| **Pro** | $9/mo (post-launch) | Unlimited sites & racks · team members · API · exports |
| **Business** | $29/user/mo (post-launch) | Multi-tenant · white-label · SSO · advanced audit |

**Self-hosters** get the full Free tier with no license needed. Pro and
Business tiers are **hosted-only at launch** — we run it for you.

**Paid self-hosting** (customers who want Pro/Business features while
self-hosting) is planned for **Phase 16** (post-launch). It'll use signed
JWT license files with instance-fingerprint binding and phone-home
revocation — proper anti-sharing enforcement, not an insecure env var.

See [`.plans/2026-04-17/06-licensing-strategy.md`](.plans/2026-04-17/06-licensing-strategy.md)
for the research-backed rationale.

See the `/#pricing` section on the landing page for the full feature matrix.

## Known limitations (pre-launch)

- **Tier limits aren't enforced yet** — the landing page says Free = 1 site / 3 racks, but the code doesn't block creation past those numbers. Enforcement lands in Phase 6F before GA so early adopters aren't grandfathered into unfair usage.
- **OAuth requires your own provider apps** — buttons appear only when you configure `GITHUB_CLIENT_ID`/`GOOGLE_CLIENT_ID` yourself. See [the OAuth setup section below](#oauth-sign-in-optional).
- **Email delivery defaults to a console logger** — in dev (and whenever `RESEND_API_KEY` is unset), password-reset and verification mails are printed to stderr instead of sent. Set `RESEND_API_KEY` in production.
- **Single-instance assumption** — rate-limit state lives in memory, so multi-instance deployments would leak past limits. Switch to `storage: "database"` + add a `RateLimit` model when scaling out.
- **Paid self-hosting isn't available at launch** — Pro/Business features run on our hosted service only. Self-host paid licensing (in-house signed-JWT + instance-fingerprint system) arrives in Phase 16 (see [`.plans/2026-04-17/06-licensing-strategy.md`](.plans/2026-04-17/06-licensing-strategy.md) for the design rationale, updated 2026-04-18 to in-house).

See [`.plans/2026-04-17/05-phase-6-polish.md`](.plans/2026-04-17/05-phase-6-polish.md) for the full fix-it list and [`CHANGELOG.md`](CHANGELOG.md) for what's shipped.

## Screenshots

| | |
|:---:|:---:|
| ![Rack Builder](public/screenshots/rack-builder.png) | ![Network Topology](public/screenshots/topology.png) |
| **Rack Builder** — drag from palette, devices span their `sizeU` | **Network Topology** — color-coded edges by cable type |
| ![Auto-Discovery](public/screenshots/discovery.png) | ![Device Inventory](public/screenshots/devices.png) |
| **Auto-Discovery** — scan a subnet, pending-device queue | **Device Inventory** — every row gets its own faceplate preview |

## Quick Start (Docker Compose)

**Requirements:** Docker + `docker compose` · nmap installed on host for discovery (optional)

```bash
git clone https://github.com/nindroid-systems/racksmith.git
cd racksmith
cp .env.example .env
# Generate a Better Auth secret
openssl rand -hex 32
# Paste it into .env as BETTER_AUTH_SECRET=...

docker compose up
```

Then open <http://localhost:3000> and register an account.

To seed the device catalog (Cisco, Dell, HPE, Ubiquiti, etc.):

```bash
docker compose exec app bunx prisma db seed
```

## Development Setup

**Requirements:** [Bun](https://bun.sh) 1.x · Docker · nmap (for discovery)

```bash
# Clone + install
git clone https://github.com/nindroid-systems/racksmith.git
cd racksmith
bun install

# Configure environment
cp .env.example .env
# Set BETTER_AUTH_SECRET (openssl rand -hex 32) in .env

# Start Postgres
docker compose up -d db

# Run migrations + seed catalog
bunx prisma migrate dev
bunx prisma db seed

# Start dev server
bun dev
```

Open <http://localhost:3000>.

### OAuth sign-in (optional)

OAuth providers only appear on the login/signup pages when their credentials are set. Email + password always works; OAuth is purely additive.

**GitHub** — [Create an OAuth App](https://github.com/settings/developers):

| Field | Value |
|---|---|
| Application name | RackSmith (or whatever) |
| Homepage URL | `http://localhost:3000` (dev) / your production URL |
| Authorization callback URL | `http://localhost:3000/api/auth/callback/github` |

Copy the Client ID and generate a Client Secret, then add to `.env`:

```bash
GITHUB_CLIENT_ID="..."
GITHUB_CLIENT_SECRET="..."
```

**Google** — [Create OAuth 2.0 credentials](https://console.cloud.google.com/apis/credentials):

1. Create a new OAuth client ID (type: *Web application*)
2. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Copy client ID + secret to `.env`:

```bash
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

**Production**: replace `localhost:3000` with your actual domain (both in the provider console and in `BETTER_AUTH_URL`). Restart the server after changing `.env`.

### Production deploy

Ships as a Docker image with a multi-stage build (deps → builder → runner, Next.js standalone output, non-root user, built-in healthcheck).

```bash
# 1. Prepare .env with the required secrets
cat > .env.prod <<'EOF'
POSTGRES_PASSWORD=<strong random password>
BETTER_AUTH_SECRET=<openssl rand -hex 32>
BETTER_AUTH_URL=https://racksmith.yourdomain.com
APP_PORT=3000
RACKSMITH_SEED=1         # seed the device catalog on first boot; set 0 after
EOF

# 2. Spin up the stack (postgres + app)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d

# 3. Health check
curl http://localhost:3000/api/health
# → {"status":"ok","checks":{"database":{"ok":true},"migrations":{"ok":true,"applied":N}}}
```

The entrypoint waits for Postgres, runs `prisma migrate deploy`, optionally seeds, then starts the standalone server. Migrations are idempotent — safe to re-deploy.

**Behind a reverse proxy (recommended)**: terminate HTTPS at nginx/Caddy/Traefik and proxy to `app:3000`. Set `BETTER_AUTH_URL` to your public HTTPS URL. The app sets HSTS when `NODE_ENV=production`.

**Postgres backups**: the `pgdata` volume holds all your data. Back it up regularly — `docker compose -f docker-compose.prod.yml exec db pg_dump -U racksmith racksmith > backup.sql`.

### Common commands

| Command | What it does |
|---|---|
| `bun dev` | Start Next.js dev server (port 3000) |
| `bun run build` | Production build |
| `bun run typecheck` | TypeScript check (no emit) |
| `bun run test` | Vitest suite |
| `bunx prisma migrate dev` | Apply schema changes |
| `bunx prisma db seed` | Seed device catalog |
| `bunx prisma studio` | Visual DB browser |

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, server components, server actions) |
| Runtime | Bun |
| Language | TypeScript 6 (strict) |
| Styling | Tailwind CSS 4 (CSS-first config) |
| Animation | Framer Motion |
| Database | PostgreSQL 17 |
| ORM | Prisma 6 |
| Auth | Better Auth (email + OAuth + 2FA) |
| Canvas | @xyflow/react (React Flow) |
| Icons | Lucide React |
| Toasts | react-hot-toast |
| Network scan | nmap (via child_process, grepable output) |
| Testing | Vitest |
| Deployment | Docker Compose (self-hosted) |

## Architecture

- **Server components** for all authenticated pages
- **Server actions** for every mutation — validated with Zod, auth via `requireUser()`, user-scoped queries
- **Proxy-based route protection** in `src/proxy.ts` (Next.js 16 pattern)
- **Device graphics** are SVG faceplates with real 10.86:1 aspect ratio per U. 9 brand palettes with dark-mode color theory applied ([research](.plans/2026-04-17/03-ux-research-ease-of-use-strategy.md)).
- **Discovery** uses fire-and-forget nmap processes; client polls scan status

See [`.plans/`](.plans/) for the full design + research docs.

## Project Status

RackSmith is **building in private** (no public launch yet — see [`.plans/2026-04-18/01-new-direction-full-build.md`](.plans/2026-04-18/01-new-direction-full-build.md)). The full v1.5 + v2.0 feature matrix ships before any announcement.

- [x] Phase 1 — Foundation (auth, DB, design system)
- [x] Phase 2 — Rack Management
- [x] Phase 2.5 — Device Visualization System
- [x] Phase 3 — Device Inventory
- [x] Phase 4 — Auto-Discovery
- [x] Phase 5 — Network Topology
- [x] Phase 6A–6F — Pre-launch polish (auth completion, prod readiness, feature polish, content truthing, tier enforcement)
- [ ] Phase 6.5 — Cross-cutting UX foundations
- [ ] Phase 7 — Subnet + IPAM + DNS *(v1.5)*
- [ ] Phase 8 — VLAN Configurator + Config Generator *(v1.5)*
- [ ] Phase 9 — Plan Wizard + Recommendations *(v1.5)*
- [ ] Phase 10 — Teams / RBAC *(v2.0)*
- [ ] Phase 11 — Public REST API + keys *(v2.0)*
- [ ] Phase 12 — Export suite *(v2.0)*
- [ ] Phase 13 — Advanced audit viewer *(v2.0)*
- [ ] Phase 14 — SSO via OIDC *(v2.0)*
- [ ] Phase 15 — Stripe billing + hosted tier *(v2.0)*
- [ ] Phase 16 — Self-host paid licensing (in-house JWT) *(v2.0)*
- [ ] Phase 17 — Launch prep (final review gauntlet)
- [ ] Phase 18 — 🚀 Public launch

Full roadmap: [`.plans/2026-04-18/01-new-direction-full-build.md`](.plans/2026-04-18/01-new-direction-full-build.md) · Original architecture doc: [`.plans/2026-04-15/02-architecture-overview.md`](.plans/2026-04-15/02-architecture-overview.md)

## Contributing & security

- [CONTRIBUTING.md](CONTRIBUTING.md) — what we accept during the v1 beta window
- [SECURITY.md](SECURITY.md) — how to report a vulnerability (not a public issue)
- [CHANGELOG.md](CHANGELOG.md) — what's shipped in each release
- [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) — full production deploy guide

## License

MIT License — see [LICENSE](LICENSE)

## Credits

Built by [Andrew Curtis](https://github.com/andrewcurtis) at [Nindroid Systems](https://nindroid.systems).

Brand inspiration and visual references from public product pages: Cisco Catalyst series, Ubiquiti UniFi line, Dell PowerEdge, HPE ProLiant, TrippLite SmartOnline. RackSmith's renderings are abstracted typographic marks and stylized SVG — no logos or proprietary assets are used.

Research acknowledgments: Nielsen Norman Group (progressive disclosure patterns), r/homelab and r/networking communities (pain-point insights), Linear team (dark-mode design philosophy). Device graphic aspect ratios sourced from Wikipedia's [19-inch rack](https://en.wikipedia.org/wiki/19-inch_rack) article.
