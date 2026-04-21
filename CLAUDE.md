# RackSmith — Agent Instructions

> **Status:** v1.5 complete on `main` (Phases 6.5 + 7 + 8 + 9 shipped, R3 passed Reality Check on 2026-04-18). v2.0 in progress (Phase 10 → Teams/RBAC, gated by R4 Multi-Tenant Security).
> **Version:** 0.0.0 (no tagged releases until v1.5 + v2.0 complete — see CHANGELOG `[Unreleased]`)

## What This Project Is

RackSmith is a unified infrastructure documentation and visualization platform. It combines rack visualization, device inventory, network topology, auto-discovery, IPAM, VLANs, config generation, plan wizards, power budgets, cable estimation, and recommendations into one beautiful tool for homelabbers, small IT teams, and MSPs.

**Positioning:** "NetBox is overkill. draw.io is too manual. RackSmith is the beautiful middle ground."

## Planning Documents (READ THESE FIRST)

Before writing any code, read these documents in order:

1. `.plans/2026-04-18/handoff-post-v1.5.md` — Authoritative current state: shipped surfaces, deferred debt, locked decisions, next-session prompt for Phase 10
2. `.plans/2026-04-18/01-new-direction-full-build.md` — v1.5 + v2.0 phase roadmap and direction change
3. `.plans/2026-04-18/02-review-framework.md` — Review types per checkpoint (R-stages)
4. `CHANGELOG.md` — Authoritative ledger of what's shipped on `main`
5. `.plans/2026-04-15/01-racksmith-prd.md` — Original PRD (positioning, behavioral segments, pricing model). The v1 scope section is **superseded** — see CHANGELOG for what's actually shipped.
6. `.plans/2026-04-15/02-architecture-overview.md` — **Stale**: project-structure section describes files that were never built (e.g. `lib/device-catalog.ts`, `lib/discovery/arp.ts`). Use the live `src/` tree as ground truth.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Runtime | Bun |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4 |
| Animation | Framer Motion |
| Icons | Lucide React |
| Database | PostgreSQL 17 (Docker) |
| ORM | Prisma 6 |
| Auth | Better Auth (email + GitHub + Google OAuth + 2FA) |
| Testing | Vitest |
| Topology | React Flow (`@xyflow/react`) |
| Network Scan | nmap binary via child_process (path: `process.env.RACKSMITH_NMAP_BIN ?? "nmap"`) |
| Notifications | react-hot-toast |
| Email | Resend (locked for v1 — swap deferred) |

## Commands

```bash
bun dev              # Dev server
bun run build        # Production build
bun run test         # Vitest suite
bunx tsc --noEmit    # Type check
bunx prisma migrate dev    # Run migrations
bunx prisma db seed        # Seed device catalog
bunx prisma generate       # Regenerate Prisma client
bunx prisma studio         # Visual database browser
```

## Project Conventions

### Architecture
- **Server Components** for all authenticated pages
- **Server Actions** for all mutations — validate with Zod via `safeParse` + `handleZodError` from `src/lib/action-helpers.ts`
- **Auth helpers (Phase 10 onward):**
  - `requireMember(role)` — tenant-scoped server actions / pages. Returns `{ session, organizationId, role }`. Throws `ForbiddenError` when rank too low.
  - `requireApiMember(role)` — tenant-scoped API routes. Returns `NextResponse` 401/403 or guard object.
  - `requireUser()` / `requireApiUser()` — user-only actions (profile, preferences, settings). Don't use for tenant-scoped work.
  - Every `requireMember*` reads `User.activeOrganizationId` fresh from DB (BA caches session.user fields; don't trust them for security checks).
- **Multi-tenancy (Phase 10 onward):**
  - **Every Prisma query on a tenant-scoped table filters by `organizationId`** AND runs inside `withTenant(organizationId, async (tx) => {...})` from `src/lib/prisma-tenant.ts`. RLS is FORCED at DB level; unwrapped queries return empty in non-compat mode.
  - **Tenant-scoped tables (must wrap):** Rack, Device, Subnet, Vlan, VlanAssignment, IpAssignment, DhcpRange, Connection, FloorPlan, DiscoveryScan, BuildPlan, RecommendationDismissal, AuditLog.
  - **Non-tenant tables (don't wrap):** User, Member, Organization, Invitation, OwnershipTransfer, UserSettings, DeviceCatalog, Session, Account, Verification, TwoFactor.
  - **Tier-checked creates use the `canCreate*Locked(tx, orgId)` variants** from `src/lib/tiers.ts` inside `withTenant` — they acquire a `pg_advisory_xact_lock` so concurrent creates serialize against the cap. Non-locked `canCreate*` is only for read-only UI enablement.
  - **`withAdmin` bypass** in `src/lib/prisma-admin.ts` is reserved for integration test infrastructure only — `tests/integration/factories.ts` (builds fresh orgs/rows across tenants) and `tests/integration/cross-tenant-isolation.test.ts` (reads across tenants to verify RLS is engaged). `prisma/seed.ts` uses a raw `PrismaClient` (it owns the DB, RLS isn't engaged against the seed run). `src/app/onboarding/welcome/page.tsx` talks to Organization + Member with raw `prisma.$transaction` (non-tenant tables; no bypass required). Adding a non-test call site needs explicit sign-off.
  - **`audit()` wraps internally in `withTenant`** — just pass `organizationId`; no outer wrapping needed.
  - **Audit action types** in `src/lib/audit.ts` — extend the `AuditAction` / `AuditEntityType` unions when adding a new verb. Don't reuse unrelated verbs.
  - `src/scripts/audit-tenant-filter.ts` runs as `bun run audit:tenant-filter` — enforces the organizationId filter at CI time. Don't silence via `EXEMPT_FILES` without a documented reason.
- **One `actions.ts` file per route directory** — don't split unless the file crosses ~1000 LOC AND covers two clearly-separate concerns. Today's one sanctioned exception: `settings/actions.ts` (profile / preferences / setActiveOrganization / accept+decline invitation — user-side) and `settings/organization-actions.ts` (rename / slug / delete / members / invites / transfer — org-admin side), split in 10g. Adding a third file under the same route requires explicit sign-off.
- **Proxy-based route protection** via `src/proxy.ts` (Next.js 16 pattern). `/invite/[id]` + `/ownership-transfer/[id]` are in `PUBLIC_PATHS` because they handle their own auth gating.
- All server-action returns use the canonical `ActionResult<T>` from `src/lib/action-types.ts` (`{ ok: true, data: T } | { ok: false, error: string, limit?: TierLimitInfo }`). Never redefine locally.
- Tier denials use `tierDenial(check)` from `src/lib/action-helpers.ts` — never inline the 11-line transform.
- **Server-action error envelopes use `withActionEnvelope(fn, fallback)`** from `src/lib/action-helpers.ts` — never hand-roll `try/catch { return { ok: false, error: err instanceof Error ? err.message : '...' } }` around a mutation. The helper catches both `ForbiddenError` (role-rank race) and unexpected Prisma/network throws, collapsing both into `ActionResult` errors. The body returns `ActionResult<T>` directly so early returns for validation/not-found/tier-denied stay inline. Used by **every** server action in `devices/`, `racks/`, `network-tools/*`, `topology/`, `discovery/`, `settings/actions.ts`, and `settings/organization-actions.ts`. The older `withForbiddenGuard` was retired in the post-10g rescan (2026-04-20) — unified envelope everywhere, no carve-outs. If a specific sub-operation needs a custom error message (e.g. `deleteOrganization` pre-delete backup, `setActiveOrganization` NotAMemberError, `requestOwnershipTransfer` email-failed rollback), use a local try/catch inside the envelope body and return an ActionResult from the catch — don't add a second wrapper.
- Assignable roles: `ASSIGNABLE_ROLES` + `AssignableRole` from `src/lib/permissions.ts` — never redeclare per call site.
- Ownership-transfer TTL: `OWNERSHIP_TRANSFER_TTL_MS` + `OWNERSHIP_TRANSFER_TTL_DAYS` from `src/lib/ownership-transfer-constants.ts` — never hardcode "3 days" in toasts/emails.
- Every server-action `planId` / `subnetId` / `vlanId` / `memberId` / `invitationId` / `transferId` / etc. parameter validates with `cuidSchema` from `src/lib/validators.ts`.
- Constants don't export from `"use server"` files (Next.js 16 rejects at runtime) — extract to a non-action module (pattern in `src/lib/profile-constants.ts`).

### Design System
- **Glass morphism dark theme** — background `#0a0e1a`, glass effects with backdrop-filter blur
- **Primary accent:** Blue (`#3b82f6`) — network/infrastructure feel
- **Color tags:** blue, purple, cyan, green, orange, red (single source of truth: `COLOR_TAGS` in `src/types/index.ts`)
- **Device types:** single source of truth: `DEVICE_TYPES` in `src/types/index.ts` (validators.ts imports from there)
- **Framer Motion** for page transitions and micro-interactions; **always honor `useReducedMotion()`** for any positional animation
- **Loading skeletons** for every data loading state
- **react-hot-toast** with dark glass styling for notifications
- **Sliders MUST carry `aria-valuetext`** so screen readers announce units, not just numbers
- **Form submit buttons inside dialogs**: `type="submit"` + `form="<id>"`, NEVER `type="button" onClick={submit}`
- **Destructive actions use `<DeleteConfirmDialog>`** from `src/components/ui/delete-confirm-dialog.tsx` — never native `window.confirm()`. High-blast-radius deletes (organization, account) pass `requireTypeName` for type-to-confirm. The primitive handles focus trap, ESC, `aria-busy`, `aria-describedby` error hint, and reduce-motion automatically.
- **Email templates** — user-controlled strings (organization name, inviter name, role) flow through `escapeHtml` from `src/lib/email-templates.ts`. The helper covers `& < > " ' \``. Never interpolate raw user input into HTML.
- **Workspace switcher** in sidebar header — server provides `memberships` + active org via dashboard layout; don't fetch in client components.

### Code Style
- Double quotes (match old RackSmith ESLint)
- Tailwind for all styling, `tailwind-merge` for class merging
- Lucide React for icons
- OAuth icons (Github / Google): use `<GithubIcon />` / `<GoogleIcon />` from `src/components/ui/oauth-icons.tsx` — never inline the SVG
- Hooks live in `src/hooks/` (not `src/lib/`)
- Colocate tests with source files (e.g., `validators.test.ts` next to `validators.ts`)
- Error handling for callers: `const result = await action(); if (!result.ok) toast.error(result.error)` — relies on the `ActionResult` contract above
- CLI-bound text fields (config-gen, VLAN names, device names) must use the `noControlChars` / `deviceNameSchema` validators that reject `\n / \r / \0`
- CSV export endpoints must run every cell through `csvSafeCell` from `src/lib/csv.ts` (CWE-1236 formula-injection defense)

### Shipped surfaces (v1.5 — these exist; do NOT re-scope as "DO NOT BUILD")

- Dashboard (stats overview + recommendations widget)
- Rack management (CRUD + visual builder with drag-and-drop)
- Device inventory (CRUD + catalog + search/filter + CSV import)
- Auto-discovery (nmap scan + pending device queue)
- Network topology (React Flow canvas)
- Subnet calculator + IPAM (subnets, IP assignments, DHCP ranges)
- VLANs + VLAN assignments
- Config generator (Cisco IOS / UniFi / HPE Aruba)
- Plan wizard (4-step server-persisted, atomic apply)
- Power budget (PoE + PDU + UPS) and cable estimator
- Recommendations engine + dismissals/snoozes
- Settings (profile, preferences, audit log viewer + export, 2FA)
- Tier system (Free / Pro / Business — counts + feature gates)
- Landing page + auth flows (email + OAuth + 2FA)

### v2.0 Scope Boundaries (in-progress)

**Phase 10 Teams / Organizations / RBAC — SHIPPED (R4 passed 2026-04-20).** See `.plans/2026-04-20/handoff-post-10f.md` for the full state + 10g follow-up list.

DO NOT build until explicitly scoped:
- White-label branding, mobile app
- SAML SSO in-house (deferred — landing copy says "OIDC at launch; SAML on request via WorkOS-style broker")
- Public REST API (deferred until tier gating + rate limiting designed)
- Monitoring integration / SNMP polling (out of scope for v1.5 + v2.0)

## Old Codebase Reference

The previous version is at `~/Desktop/GitHub-Repos/racksmith-deprecated/`. Use it ONLY as a visual/design reference:
- `src/index.css` — Glass morphism CSS classes
- `src/components/rack/RackVisualizer.tsx` — Visual rack rendering
- `src/components/rack/DevicePalette.tsx` — Device picker for drag-and-drop
- `src/components/floor-plan/` — Topology components
- `src/types/entities.ts` — Entity type definitions
- `src/data/` — Device catalog data

Do NOT port code directly. Rebuild clean using Next.js patterns.
