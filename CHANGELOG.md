# Changelog

All notable changes to RackSmith are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). This project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

> **2026-04-18 direction change:** no tagged releases will ship until the
> full v1.5 + v2.0 feature matrix is complete. Everything below is
> pre-release work tracked on `main`. See
> [`.plans/2026-04-18/01-new-direction-full-build.md`](.plans/2026-04-18/01-new-direction-full-build.md).

### Added — Phase 13: Stripe billing
- **Hosted-only paid tiers go live** — Pro and Business plans are now real,
  not "join the waitlist" placeholders. Free tier remains free forever.
- Stripe Checkout flow: admins on a Free org → Settings → Billing →
  pick monthly or annual → Checkout → return to dashboard with the
  plan flipped via webhook. Email-verification gate enforced before
  Checkout (disposable-email + stolen-card defense).
- Stripe Customer Portal: paid orgs get a "Manage billing" button that
  opens the Stripe-hosted portal for plan switches, payment-method
  updates, invoices, and cancellation. RackSmith never sees a card
  number.
- Webhook handler at `/api/webhooks/stripe` ingests 6 events
  (`customer.subscription.{created,updated,deleted}`,
  `invoice.payment_{failed,succeeded}`, `charge.refunded`) with HMAC
  verification, atomic `StripeEvent` dedupe, and per-org RLS dispatch.
- Real-time Business seat sync: adding or removing a Member on a
  Business org pushes the new quantity to Stripe under a
  `pg_advisory_xact_lock` so concurrent updates linearize. Stripe
  prorates the next invoice (`create_prorations`).
- Site-wide past-due payment banner for admins/owners — surfaces the
  failure with a one-click portal CTA. Plan stays active during Stripe
  Smart Retries (no hard downgrade during dunning).
- Plan summary card on `/settings/billing` showing plan, billing cycle
  (monthly/annual), price, next-invoice date, and payment status.
- Landing-page pricing CTAs ("Try Pro", "Try Business") now lead to
  signup → billing with the chosen tier highlighted on return.
- New audit verbs: `subscription_{created,updated,deleted}`,
  `payment_{failed,succeeded,refunded}`, `customer_portal_opened`.
- New `Organization` columns: `stripeCustomerId` (unique),
  `stripeSubscriptionId`, `stripeSubscriptionItemId`, `stripePriceId`,
  `paymentStatus`. New `StripeEvent` table for webhook idempotency.
- 6 Stripe environment variables documented in `.env.example` and
  `docs/INTERNAL_DEPLOY.md` §6: `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, and 4 `STRIPE_PRICE_*` IDs (one per
  tier × billing cycle). Test-mode + live-mode setup runbook included.

## [2.1.0-beta] — 2026-04-22

### Added
- **Public REST API (beta)** at `/api/v1/`:
  - Full CRUD for Racks (`GET/POST /api/v1/racks`, `GET/PATCH/DELETE /api/v1/racks/{id}`)
  - Full CRUD for Devices (`GET/POST /api/v1/devices`, `GET/PATCH/DELETE /api/v1/devices/{id}`)
  - Org-scoped API keys in Settings → API Keys (Pro: 5 keys / 120 req/min, Business: 50 keys / 1200 req/min)
  - DB-backed sliding-window rate limiting with `X-RateLimit-*` response headers
  - Scalar-rendered docs at `/api/v1/docs`; OpenAPI 3.1 spec at `/api/v1/openapi.json`
  - Auto-revoke of API keys when their creator is removed from the org
- New audit verbs: `api_key_created`, `api_key_revoked`, `api_key_auto_revoked`, and `api_key` entity type
- `ApiKey` (non-tenant) + `ApiRequestLog` (tenant-scoped FORCE RLS) Prisma models

### Fixed
- `src/proxy.ts`: `/api/v1/*` now bypasses the session-cookie redirect — bearer-token clients can reach the API handlers
- `next.config.ts`: per-route CSP carve-out for `/api/v1/docs` permits the Scalar CDN while keeping the global CSP strict
- `scripts/prepare-test-db.sh`: now auto-discovers RLS migrations by pattern rather than hardcoded list — future phases with RLS land cleanly on the test DB
- `scripts/audit-tenant-filter.ts`: `apiRequestLog` added to TENANT_MODELS so future queries on it get static-check coverage

### Notes
- v1 is **beta**. Breaking changes are possible until GA; monitor CHANGELOG entries tagged `api-v1-breaking`.
- Anonymous IP-based rate limiting is the reverse proxy's responsibility (Caddy/nginx) and not implemented in-app.

### v2.0 Phase 10 — Teams / Organizations / RBAC (2026-04-19 → 2026-04-20)

Multi-tenant foundation. Every resource in RackSmith now lives inside an
`Organization`; users belong to orgs via `Member` rows with a four-tier
role system (`owner` / `admin` / `member` / `viewer`). R4 Multi-Tenant
Security checkpoint passed with Reality Checker sign-off on 2026-04-20.

**Schema + migration.** New `Organization`, `Member`, `Invitation`,
`OwnershipTransfer` tables; `organizationId NOT NULL` on all 13
tenant-scoped models (`Rack`, `Device`, `Subnet`, `Vlan`, `VlanAssignment`,
`IpAssignment`, `DhcpRange`, `Connection`, `FloorPlan`, `DiscoveryScan`,
`BuildPlan`, `RecommendationDismissal`, `AuditLog`). `User.plan` /
`User.planExpiresAt` moved to `Organization`. `User.activeOrganizationId`
replaces the per-user plan field. Unique constraints on `Subnet.cidr`,
`Vlan.vlanId`, and `RecommendationDismissal.(ruleKey, entityKey)` scoped
to `organizationId`. Hand-crafted data-migration backfills a personal
Organization per existing user (deterministic `'org_' || user.id` IDs)
then flips to `NOT NULL`. Partial unique index on
`Invitation(organizationId, LOWER(email)) WHERE status = 'pending'`
enforces one-in-flight pending invite per address.

**Better Auth Organization plugin** wired via `src/lib/auth.ts` with
custom `viewerAc` empty-permission role, 7-day invitation expiry,
`organizationLimit` callback (Free=3 / Pro=10 / Business=∞ by highest
plan across memberships), `membershipLimit` (per-org plan's `teamMembers`),
flat `invitationLimit: 50`, rate limits on `/organization/invite-member`
+ `/organization/accept-invitation` in BA's memory store.

**PostgreSQL RLS.** `FORCE ROW LEVEL SECURITY` + `_tenant_isolation`
policy on all 13 tenant-scoped tables. Policy predicate is
`app.role = 'admin' OR coalesce(app.organization_id, '') = '' OR "organizationId" = app.organization_id`
(compat-mode NULL branch to be dropped in 10g once every page-file read
is verified to flow through `withTenant`). Split DB roles in dev/prod:
`racksmith_app` (NOSUPERUSER NOBYPASSRLS) for the app runtime,
`racksmith` (super) for Prisma migrations via `directUrl`.

**Tenant plumbing.** `src/lib/prisma-tenant.ts`: `withTenant(orgId, fn)`
opens a transaction and runs `set_config('app.organization_id', orgId, true)`
so every query inside is RLS-filtered; `acquireTenantResourceLock(tx,
orgId, resource)` uses `pg_advisory_xact_lock(hashtext(orgId),
hashtext(resource))` to serialize tier-counting `canCreate*Locked`
variants against concurrent creates. `src/lib/prisma-admin.ts`:
`withAdmin(fn)` sets `app.role = 'admin'` for seeds + onboarding auto-org
+ tests (exactly 3 legitimate call sites, documented).

**Auth helpers.** `requireMember(role)` / `requireApiMember(role)` in
`src/lib/auth-helpers.ts` read `User.activeOrganizationId` fresh from DB
(BA caches user fields in session and doesn't refresh when columns
change — one extra query per action avoids a redirect loop after
onboarding or workspace switch). Role hierarchy +
`roleHasAccess(current, required)` in `src/lib/permissions.ts`.

**Server actions.** Every mutation in the 11 action files under
`src/app/(dashboard)/` passes through `requireMember` and wraps
tenant-scoped Prisma ops in `withTenant`. Tier-checked creates use the
`canCreate*Locked` variants inside the transaction
(`canCreateRackLocked`, `canCreateDeviceLocked`, `canCreateSubnetLocked`,
`canCreateVlanLocked`, `canCreatePlanLocked`). `preflightTierChecksLocked`
in `src/lib/plan/materialize.ts` acquires all four resource locks before
counting, closing the TOCTOU window in `applyBuildPlan`. `approveDiscovery`
gained a tier check at create time (a scan approve is a new device).
`audit()` wraps internally in `withTenant` — callers don't need to wrap.

**Invite + ownership-transfer flows.** `inviteMember` (admin),
`revokeInvitation` (admin), `resendInvitation` (admin),
`acceptInvitationAction` (authed user, reads `Invitation.organizationId`
directly rather than trusting BA's response shape), `declineInvitationAction`.
Custom 3-day-TTL ownership transfer with atomic role swap inside a
transaction: `requestOwnershipTransfer` (5/hour/owner rate limit,
revokes any prior pending transfer, preserves state on email-send
failure), `confirmOwnershipTransfer` (target-side, re-reads + role-guards
inside the swap transaction), `revokeOwnershipTransfer` (initiator-side),
`declineOwnershipTransfer` (target-side). Unauthenticated
`/invite/[id]` + `/ownership-transfer/[id]` accept pages with
enumeration-safe "no longer valid" copy for missing / canceled / expired
tokens.

**Pre-delete JSON snapshot for organization delete.** `deleteOrganization`
(owner-only, type-to-confirm) first dumps every resource row + member +
invitation + audit log to `${RACKSMITH_BACKUP_DIR}/{orgId}-{ts}.json`
at mode `0600` inside a dir created at mode `0700`. Aborts the delete
on backup failure. `console.warn` line emitted before the cascade
preserves the backup path in host logs (the DB audit row cascades away
with the org).

**UI surfaces.** `<DeleteConfirmDialog>` primitive in
`src/components/ui/delete-confirm-dialog.tsx` (focus trap, ESC handling,
optional type-to-confirm with `aria-invalid` + `aria-describedby` live
region, `aria-busy` during pending, reduce-motion honored).
`<OrganizationSwitcher>` in sidebar header (keyboard nav with arrow keys
+ Home / End + ESC-restores-focus, `role="menu"` + `role="menuitemradio"`
+ `aria-checked`, reduce-motion honored). Settings → Organization
section: general (name, slug, plan badge, viewer role), members table
with role-change dropdown + remove button + transfer-ownership icon
(owner only), invite form + pending-invitations table with
resend/revoke, pending-transfer banner with cancel (owner) / decline
(target), danger zone with type-to-confirm delete (owner only).
Onboarding `/onboarding/welcome` auto-creates a personal Organization
via `generateSlugFromName` + `validateSlug` with a retry loop on
reserved-slug rejections.

**Reserved-slug blocklist.** `src/lib/slug.ts` blocks `admin`, `api`,
`auth`, `dashboard`, `invite`, `onboarding`, `ownership-transfer`, plan
wizard / ipam / vlans / topology / discovery paths, plus reset-password
+ two-factor-verify + other auth routes (40 total). `validateSlug`
enforces RFC-1035-ish character set + length (2–63 chars).

**Static defenses.** `scripts/audit-tenant-filter.ts` runs as
`bun run audit:tenant-filter` — scans 217 files for Prisma calls on
tenant-scoped tables that lack `organizationId` in `where` (or `data`
for creates). Accepts safe patterns (by-unique `where: { id }`,
shorthand `{ where }`, opaque `where: varName`). Exempts
`prisma-tenant.ts`, `prisma-admin.ts`, `audit.ts`, `organization-export.ts`
with documented rationale. `.semgrep/missing-tenant-filter.yml` covers
all read methods on tenant tables as backup.

**Integration test suite.** `docker-compose.test.yml` spins an isolated
Postgres 17 on port 5433 with a `racksmith_test_app` role
(NOSUPERUSER NOBYPASSRLS) so RLS actively enforces in tests.
`tests/integration/cross-tenant-isolation.test.ts` asserts 19 scenarios
across Rack / Device / Subnet / VLAN / Member / AuditLog / BuildPlan /
RecommendationDismissal that Org B cannot read, update, delete, count,
or leak via unfiltered `findMany` into Org A's data. `withAdmin`
positive-control verifies the bypass works end-to-end. Run via
`bun run test:integration` after `bun run test:integration:prepare`.

**Email safety.** `escapeHtml` helper in `src/lib/email-templates.ts`
covers `& < > " ' \``; both `organizationInviteEmail` + new
`ownershipTransferEmail` run every user-controlled field through it.

**Documented debt for 10g.** RLS compat-mode NULL branch to drop after
page-file read audit; timing side-channel in `declineInvitationAction`;
optional `settings/actions.ts` split (now 1200+ LOC); expanded audit
verbs for invitation resend (currently reuses `member_invited` with a
`resend: true` change flag); CQ-M4 `itemsRef` type in
`OrganizationSwitcher`; minor accessibility polish items per the
R4 reviewer report.

**Verification at R4 sign-off.** `bunx tsc --noEmit` clean,
`bun run test` 83/83 in ~290ms, `bun run test:integration` 19/19 in
~850ms, `bun run audit:tenant-filter` clean across 217 files,
`bun run build` 49 routes, all Phase 10 migrations applied. Fix list
spans 22 Critical/High/Medium items resolved in-session after the
three-reviewer R4 pass (Security Engineer, ns-code-reviewer,
ns-ux-ui-accessibility-reviewer) + Reality Checker final GO.

### v2.0 Phase 10g — post-R4 Priority 1 security hardening (2026-04-20)

Three items from the 10g debt list closed. Green bar held across the
cluster.

**RLS strict mode (Sec-M2).** `20260420120000_phase_10g_rls_strict`
migration drops the compat-mode "unset session variable = allow"
branch from every tenant-scoped table's policy. Post-migration
predicate is `admin OR organizationId matches`. Prerequisites landed
in the same cluster:

- `src/lib/tiers.ts` — all 10 `canCreate*` / `getUsageSummary` count
  queries now route through `withTenant(organizationId, tx => ...)`.
- `src/lib/organization-export.ts` — the pre-deletion snapshot reads
  all 17 tables inside a single `withTenant` transaction, preserving
  the consistent-snapshot guarantee without needing a compat branch.
- `scripts/audit-tenant-filter.ts` — adds a second invariant beyond
  the original organizationId-filter check: any
  `prisma.<tenantModel>.*` outside the two wrapper-defining files
  (`prisma-tenant.ts`, `prisma-admin.ts`) now fails the audit. The
  script also accepts `{ data }` object-shorthand symmetric with the
  existing `{ where }` acceptance.
- `scripts/prepare-test-db.sh` — replays both the 10b create + 10g
  strict migrations so the test DB's policy matches prod.
- `tests/integration/cross-tenant-isolation.test.ts` — two regression
  tests prove strict behavior: `prisma.rack.findMany` with no
  session variable returns empty; `prisma.rack.create` with no
  session variable is rejected by the policy.

**Timing side-channel on invitation flows (Sec-H5).** Both
`declineInvitationAction` and `/invite/[id]/page.tsx` collapsed the
old `findUnique(id)` → string-compare-email pattern into a single
`findFirst` with `{ id, email: { equals, mode: "insensitive" } }`
in the WHERE. All failure modes (bad ID, wrong email, expired,
revoked) now take one round-trip with uniform timing. The page
lost its "this invitation is for `<email>`" branch in favor of a
generic "no longer valid" message with a "sign out + back in with
the right account" hint — trades a minor UX cue for uniform
response time plus closing the target-email enumeration channel.

**`setActiveOrganization` atomicity (Sec-M6).** The member lookup,
`user.update`, and audit-log write now share a single
`withTenant(idCheck.data, async tx => ...)` transaction. `audit()`
gained an optional `tx: Prisma.TransactionClient` parameter so
callers can opt into shared atomicity; the default auto-wrapping
best-effort mode is preserved. A typed `NotAMemberError` propagates
through the tx boundary so the caller can translate it to the
standard `ActionResult` error without swallowing unrelated throws.

**`withTenant` JSDoc** rewritten to document the post-10g strict
policy and the fail-closed invariant.

**Verification at 10g-P1 close.** `bunx tsc --noEmit` clean,
`bun run test` 83/83 in ~235ms, `bun run test:integration` 21/21 in
~960ms (+2 strict-mode regression tests), `bun run audit:tenant-filter`
clean across 221 files, `bun run build` 49 routes. 13 Phase 10g
migration ALTER POLICYs applied to both `racksmith` (port 5432) and
`racksmith_test` (port 5433).

### v2.0 Phase 10g — post-R4 Priority 2 UX polish (2026-04-20)

Six accessibility follow-ups from the 10f R4 reviewer report.

**`DeleteConfirmDialog` reduced-motion exit (UX-L1).** When
`useReducedMotion()` is true, the panel's exit transition now
explicitly animates `{ opacity: 0 }` instead of falling back to
Framer's defaults (which could animate `y` / `scale` against the
reduce-motion preference). The close button also grew to a
44×44 minimum hit target.

**Invite form aria-busy (UX-L4).** The Settings → Organization
"Invite" submit button and the per-row "Revoke invitation" button
now carry `aria-busy` during the pending transition; the resend
button already had it from 10f.

**Touch-target audit (UX-M2).** Every icon-only action button that
was `rounded(-md)? p-1.5` with an `h-4 w-4` glyph now wraps its
content in `inline-flex min-h-[44px] min-w-[44px] items-center
justify-center`. Surfaces touched: Settings → Organization
(transfer-ownership, remove-member, resend-invite, revoke-invite,
delete-dialog close), and the network-tools surfaces (assignment
edit, IP assignment dialog close, DHCP-range delete, VLAN
assignment remove). Meets WCAG 2.5.5 target size AAA while keeping
the visual padding unchanged.

**Role pill aria-labels (UX-M3).** Every span that uses
`uppercase tracking-wide` CSS for a role or plan pill now carries
an explicit sentence-case `aria-label` (e.g. `aria-label="Plan: Free"`,
`aria-label="Your role: Admin"`, `aria-label="Owner"`,
`aria-label="Admin"`). Mobile screen readers that read
visually-uppercased text letter-by-letter ("A–D–M–I–N") fall back
to the aria-label and announce the word. The redundant
`role="group" aria-labelledby="..."` wrappers dropped in favor of
a single labelled span.

**`?tab=organization` scroll announces (UX-M1).** The
`OrganizationSection` wrapper gains `tabIndex={-1}`,
`aria-labelledby="organization-section-heading"`, and
`focus:outline-none`. The existing `scrollIntoView` effect now
also calls `el.focus({ preventScroll: true })` after the smooth
scroll, so screen readers announce the "Organization" heading on
tab-switch instead of the user silently landing in the section.

**Gradient-text contrast on `/onboarding/welcome` (UX-M5).**
Verified — no code change needed. The three `.gradient-text`
stops (#60a5fa, #a78bfa, #f0abfc) against the `glass-panel`
background (0.06–0.10 rgba(255,255,255) over `#0a0e1a`) compute
to a worst-case contrast of ~5.9:1 on the lightest panel area
for the darkest stop. Well above the 3:1 WCAG AA threshold for
large text (`text-2xl font-bold` = 24px bold = large), and above
the 4.5:1 AA threshold for normal text.

**Verification at 10g-P2 close.** `bunx tsc --noEmit` clean,
`bun run test` 83/83, `bun run test:integration` 21/21,
`bun run audit:tenant-filter` clean across 221 files,
`bun run build` 49 routes.

### v2.0 Phase 10g — post-R4 Priority 3 code-quality cleanup (2026-04-20)

Eight code-quality follow-ups from the 10f R4 reviewer report.

**`settings/actions.ts` split (CQ-H2).** 1132-line file split along
the user-side / org-admin-side seam:

- `settings/actions.ts` (~330 LOC): `saveProfile`, `updateProfile`,
  `updatePreferences`, `setActiveOrganization`,
  `acceptInvitationAction`, `declineInvitationAction`.
- `settings/organization-actions.ts` (~620 LOC, new):
  `renameOrganization`, `updateOrganizationSlug`, `updateMemberRole`,
  `removeMember`, `deleteOrganization`, `inviteMember`,
  `revokeInvitation`, `resendInvitation`, `requestOwnershipTransfer`,
  `confirmOwnershipTransfer`, `revokeOwnershipTransfer`,
  `declineOwnershipTransfer`.

Importers updated: `organization-section.tsx` now pulls admin-side
actions from `./organization-actions`; `ownership-transfer-form.tsx`
updated to the new path. CLAUDE.md convention (`one actions.ts per
route`) now explicitly sanctions this split and documents the gate
for adding a third file.

**`ForbiddenError` catch (CQ-M6).** `src/lib/action-helpers.ts`
gains `withForbiddenGuard(fn)` — a one-liner wrapper that catches
`ForbiddenError` from `requireMember` and returns a friendly
`ActionResult` error instead of bubbling to Next's 500 boundary.
Applied to every admin-gated action in `organization-actions.ts`
(rename, slug, member-role, remove-member, delete-org, invite,
revoke, resend, ownership request/revoke). `confirmOwnershipTransfer`
and `declineOwnershipTransfer` use `requireUser` (not
`requireMember`) so they don't need the guard.

**Dedupe `ASSIGNABLE_ROLES` (CQ-M1).** Now a `readonly tuple`
exported from `src/lib/permissions.ts` (with `AssignableRole`
type). `z.enum(ASSIGNABLE_ROLES)` in the invite schema keeps the
literal union on the parsed value. The client-side duplicate in
`organization-section.tsx` dropped.

**Dead `Building2` re-export removed (CQ-M3).** Icon was only
imported to re-export, never used inside
`src/components/layout/organization-switcher.tsx`. Import +
re-export both dropped; no consumers in the codebase.

**`itemsRef` typing tightened (CQ-M4).** Menu items mix
`<button>` workspace rows with `<Link>` (anchor) create / settings
rows. `itemsRef` changed from `Array<HTMLButtonElement | null>` to
`Array<HTMLButtonElement | HTMLAnchorElement | null>`. The
`.filter(Boolean) as HTMLButtonElement[]` cast replaced with a
proper type predicate; both Link `ref` callbacks dropped their
`as unknown as HTMLButtonElement` cast. Keyboard nav (`focus()`)
works the same — both element types implement `HTMLElement.focus`.

**`invitation_resent` audit verb (CQ-M2).** New verb in the
`AuditAction` union; `resendInvitation` emits it with
`{ email, role }` changes (formerly reused `member_invited` with
`resend: true` flag).

**"3 days" derived from constant (CQ-H4).** New file
`src/lib/ownership-transfer-constants.ts` exports
`OWNERSHIP_TRANSFER_TTL_MS` + `OWNERSHIP_TRANSFER_TTL_DAYS`
(derived from the ms value). `organization-section.tsx` toast and
confirmation-dialog body, plus both ownership-transfer email
branches (HTML + plaintext), now interpolate the days constant.

**`describeError` extracted to `action-helpers.ts`.** Replaces
two duplicated local copies (old `actions.ts` and new
`organization-actions.ts`). Safe migration — identical semantics.

**Audit script `withAdmin` detection (CQ-M5).** A third invariant:
any file in `src/app`, `src/lib`, or `src/components` that
references `withAdmin` fails the audit unless listed in a new
`WITHADMIN_EXEMPT_FILES` allowlist with a justification comment.
Currently only `src/lib/prisma-admin.ts` (the definition) is
allow-listed. The two legitimate `withAdmin` call sites outside
`src/` (seed, integration factories) live outside the audit's
scan roots. Adding a new in-`src/` call site becomes a deliberate,
code-reviewed action.

**Verification at 10g-P3 close.** `bunx tsc --noEmit` clean,
`bun run test` 83/83, `bun run test:integration` 21/21,
`bun run audit:tenant-filter` clean across 223 files (new
`organization-actions.ts` + `ownership-transfer-constants.ts`
scanned), `bun run build` 49 routes.

### v1.5 cleanup — desloppify high-confidence batch (2026-04-18)

Closed 29 of the 47 high-confidence findings surfaced by the v1.5 baseline
desloppify subjective review. Test suite stays 83/83, build stays at 47
routes, typecheck clean. Closeout in
[`.plans/2026-04-18/v1.5-cleanup-closeout.md`](.plans/2026-04-18/v1.5-cleanup-closeout.md).

- **ActionResult contract unified** — `discovery/actions.ts`, `settings/actions.ts`,
  `recommendations/actions.ts`, and `plan/materialize.ts` all import the canonical
  `ActionResult<T>` from `@/lib/action-types`; `settings/actions.ts` switches from
  throwing `schema.parse` to `safeParse + handleZodError + try/catch + ActionResult`
  matching every other action file. Callers (`profile-section.tsx`, `preferences-section.tsx`,
  `profile-quiz.tsx`) now use the standard `if (!result.ok) toast.error(result.error)` pattern.
  `preflightTierChecks` no longer returns the nonsensical `ActionResult<{ ok: true }>` —
  signature is now `Promise<ActionResult>`.
- **Type vocabulary deduplicated** — `COLOR_TAGS` and `DEVICE_TYPES` are now `as const`
  tuples in `src/types/index.ts` (single source of truth); `validators.ts` imports them
  instead of redefining. `DropPayload` + `VisualizerDevice` extracted to
  `src/components/rack/types.ts` (closes the `drag-state.ts ↔ rack-visualizer.tsx` import
  cycle). Subnet `Lite` types extracted to `src/components/network-tools/subnet-types.ts`
  (closes the 5-file `subnet-detail-client.tsx` ↔ children cycle).
- **API auth idiom unified** — new `requireApiUser()` helper in `src/lib/auth-helpers.ts`
  returns either a session or `NextResponse 401`; `audit/export` and `ipam/export` routes
  switched from `requireUser()` (which redirects to /login) so fetch-style API consumers
  get JSON 401 instead of a 307 to HTML.
- **Dead code purged** — deleted `src/components/rack/device-graphic/primitives/port-row.tsx`,
  `src/components/ui/smart-default.tsx`, `src/components/ui/validation-error.tsx`
  (zero importers each); deleted `CableType` from `src/types/index.ts` (zero importers,
  duplicate of validators' `CABLE_TYPES`); deleted the `CableType` compat alias from
  `src/lib/cable/limits.ts` and renamed all 7 callers to `CableMediaType`; removed the
  unused `palette` prop from `<PortNumbering>` and its 2 call sites.
- **OAuth icons consolidated** — extracted `<GithubIcon>` + `<GoogleIcon>` to
  `src/components/ui/oauth-icons.tsx`; `login-form.tsx`, `register-form.tsx`, and
  the landing page now import instead of inlining 30+ lines of SVG paths each.
- **DEV_BYPASS_FLAG → call-time helper** — `src/lib/tiers.ts` now reads the bypass
  env at call time via `isDevBypassEnabled()` (was a module-import snapshot with a
  top-level `console.warn` side effect). Tests can mutate `process.env` and the change
  is picked up; production short-circuit is unchanged.
- **nmap binary path** — real bug. `src/lib/discovery/nmap.ts` was hard-coded to
  `/opt/homebrew/bin/nmap` so discovery silently `ENOENT`'d on every non-arm64-brew
  host. Now reads `process.env.RACKSMITH_NMAP_BIN ?? "nmap"` (PATH-based fallback).
- **`connection-form.tsx` init dedup** — extracted `buildInitialState(existing, prefilled)`
  helper; useState initializers and the open-effect reset both call it instead of duplicating
  the 8-field expression twice.
- **File moves** — `src/lib/use-focus-trap.ts` → `src/hooks/use-focus-trap.ts`
  (3 import paths updated); `src/components/command-palette.tsx` → `src/components/layout/command-palette.tsx`
  (1 import path updated). `src/hooks/` is no longer empty; `src/components/` no longer
  has a stray top-level component.
- **Dependency pinning** — `package.json` swapped `"latest"` for caret ranges resolved
  from `bun.lock` on 10 runtime + 8 dev deps. Reproducible installs; better-auth and Next
  no longer silently bump on a fresh `bun install`.
- **CLAUDE.md scope refresh** — the "DO NOT build IPAM / cables / port mgmt in v1"
  section was contradicting `src/lib/ip/`, `src/lib/cable/`, and the IPAM/VLAN/config-gen
  routes that Phases 7-9 actually shipped. Rewritten to reflect v1.5 reality + v2.0
  scope (Phase 10 next, Teams/RBAC). Stale architecture doc at
  `.plans/2026-04-15/02-architecture-overview.md` got an updated banner pointing
  callers at the live `src/` tree.

### Deferred to v2.0 (not in this batch)

- 6 `test_strategy` findings (auth-helpers, csv, matcher, rack-placement, server actions,
  tiers — all need test backfill, big lift; tracked against the test_health 9.7 % drag).
- AuthCard shell + 2FA password-form dedup (multi-file refactor).
- `lib/<domain>/index.ts` barrel policy decision (facades everywhere or nowhere).
- `network-tools/` 23-file flat directory split (aligns with Phase 10 path restructuring
  — do it then, not separately).
- `rack-visualizer` 90-line slot-extraction + `/api/discovery/scan` inline-pipeline
  extraction (aesthetic).

### Shipped on `main` so far
Includes all Phase 6F completions (tier-limit enforcement — Free = 1 site /
3 racks, usage UI in settings + racks list, upgrade-prompt banner on
`/racks/new` at limit, dev-only tier bypass hard-wired to no-op in
production) plus all of Phase 6.5:

- **Phase 6.5 — cross-cutting UX foundations** (2026-04-18, R1 gauntlet
  passed Reality Check). Delivers the reusable primitives every later
  phase inherits:
  - `<Tooltip term>` + `networking-glossary.ts` (~40 networking terms
    with short/long definitions, optional external links)
  - `<InlineHelp>` (label + help button + glossary-bound tooltip)
  - `<ValidationError>`, `<SmartDefault>`, `<AdvancedAccordion>` form
    helpers (AdvancedAccordion wired into `DeviceForm` for Network +
    Rack placement sections; the other two stage for Phase 7 IPAM forms)
  - `<EmptyStateWithTemplate>` + `<TemplateGallery>` now replace the
    bespoke "no racks / devices / topology yet" blocks on `/racks`,
    `/devices`, and `/topology`
  - Rack templates (5: homelab 12U, office 22U, MDF 42U, client 24U,
    colo 42U) and device quick-starts (6: firewall, 24-port switch,
    48-port PoE+ switch, 1U server, switched PDU, 1500VA UPS) create
    resources in one click from their galleries
  - `⌘K` / Ctrl+K global command palette (cmdk-based) mounted at the
    dashboard shell: jump to any page, create resources, sign out
  - 3-step onboarding profile quiz (role / scale / use) persisted on
    `User.profileRole/Scale/Use/CompletedAt`; skippable, audits as
    `profile_saved` / `profile_skipped`
  - Accessibility: dialog focus traps (`useFocusTrap` hook),
    progressbar semantics on the quiz, `prefers-reduced-motion`
    guards on body gradient, gradient-text shimmer, and skeleton
    pulses, `aria-describedby` instead of `title` on the rack-limit
    banner
  - Cleanup: extracted `handleZodError` to `src/lib/action-helpers.ts`
    (was duplicated in 3 action files); removed dead
    `createFromCatalog` export; excluded Playwright e2e specs from
    the Vitest run

- **Phase 7 — subnet calculator + IPAM MVP** (2026-04-18, R2 network-tools
  checkpoint passed Reality Check). Ships the first decision-support surface:
  - `ipaddr.js`-backed IP math library at `src/lib/ip/` (parse, calculate,
    range, vlsm, aggregate, conflicts, suggest, advisor) with 36 unit tests
  - **Subnet calculator** at `/network-tools/subnet-calc` — IPv4 + IPv6
    details (network/broadcast/first-last-usable/wildcard/netmask/binary) +
    VLSM splitter that sizes a parent CIDR for named-host requirements
  - **IPAM** at `/network-tools/ipam` — Prisma models `Subnet`,
    `IpAssignment`, `DhcpRange`; full CRUD with audit trail; tier-gated via
    `canCreateSubnet` (Free = 3 subnets)
  - **Subnet grid** — 16-col visualization for ≤1024 addresses, summary for
    larger; color-coded cells for free / assigned / reserved / DHCP /
    conflict (static landing in a DHCP pool) / network / broadcast
  - **DHCP range** add + delete per subnet, overlap-checked against
    existing ranges and static assignments
  - **IP assignment dialog** opens on any grid cell click — edit status,
    link to a device, add notes, or press **Suggest** for next-free IP
    (respects gateway + DHCP pools)
  - **Address Space Advisor** on subnet-create warns on: existing-subnet
    overlap (blocking), AWS/Azure/GCP default-VPC overlap (soft), non-RFC1918
    IPv4 picks, narrower-than-/64 IPv6
  - **CSV export** at `/api/ipam/export?format=csv|json` with a 10k-row
    cap and clean RFC-4180-style quoting
  - **Nav:** sidebar gains a *Network Tools* group with Subnet Calc + IPAM;
    command palette gains navigate-to and create-subnet entries
  - **Dashboard widget:** link card showing subnet + assignment counts
- **Phase 6.5 carryover** bundled with Phase 7: shared `ActionResult<T>`
  at `src/lib/action-types.ts`, `validateRackPlacement` extracted to
  `src/lib/rack-placement.ts`, `canCreateDevice` added for tier symmetry,
  `tsconfig.json` target bumped to ES2022 for BigInt literal support

- **Phase 8 — VLAN configurator + config generator** (2026-04-18, micro-review
  closed with all Critical + High findings addressed). Completes the v1.5
  network-tools trio (IPAM → VLANs → config export):
  - Prisma models: `Vlan`, `VlanAssignment`; `Subnet.vlanId` relation lets a
    subnet declare its VLAN membership (migration `20260418194249_add_vlan`)
  - VLAN CRUD at `/network-tools/vlans` — create/edit/delete with tier gating
    (Free = 5 VLANs), 802.1Q ID validation (1-4094), 7 purpose enums
  - **VLAN coverage matrix** — switches × VLANs, device-level dots show which
    VLAN is assigned where; orphan-VLAN warning surfaces VLANs with zero
    device assignments
  - **Per-device VLAN assignment** — add/remove assignments with
    mode (access / trunk / native) and optional port number + tagged flag
  - **Bidirectional Subnet ↔ VLAN linking** — a subnet can declare its VLAN,
    and the VLAN detail page lists all linked subnets with an unlink control
  - **Hand-rolled multi-vendor config generator** at
    `/network-tools/config-gen`:
    - **Cisco IOS** — VLAN database + per-interface configs, trunk allowed-list
      compression (10,20,55-60), mixed access+trunk handled as native-vlan
    - **UniFi** — JSON site-config snippet with `networks` + `port_overrides`
      arrays, pastes into UniFi site settings
    - **HPE Aruba ProVision** — VLAN-context CLI with `untagged` + `tagged`
      port lists, port-compression, conflict warnings on
      multi-untagged ports
  - **VLAN template library** — three starter schemes (3-tier office, Home
    with IoT+Guest, MSP 5-VLAN) apply in one click, skip existing VLAN IDs,
    respect tier limits
  - **Security hardening** — CLI-injection defense via `cliSafeText` + the
    `DANGEROUS_CHARS = /[\p{Cc}\p{Cf}\u2028\u2029]/u` Unicode class, applied
    both at the Zod validator layer and at each vendor's sanitization step
    (defense in depth); UniFi output now uses `REPLACE_ME_*` placeholders
    instead of invalid `"all"` / `"vlan-N"` portconf IDs
  - **Sidebar + palette:** Network Tools group now carries Subnet Calc,
    IPAM, VLANs, Config Gen; command palette gains navigate + create actions
  - 8 new config-gen unit tests (covering compression helpers, each vendor's
    output shape, sanitization, warnings) on top of the 36 IP-lib tests

- **R3 v1.5 Complete Review** (2026-04-18) — closed Reality Checker **READY**.
  Closes Phase 6.5 + 7 + 8 + 9 as the v1.5 build block. Highlights of the R3
  fix loop: `tierDenial(check)` helper consolidates 8 duplicated tier-denial
  blocks across 5 action files; CLI-injection defense extended to `deviceSchema.name`;
  Pro+ tier gates wired on `/api/audit/export` + `/api/ipam/export`; CSV
  formula-injection neutralized via `csvSafeCell`; wizard stepper + recommendation
  cards meet WCAG 2.2 AA (focus rings, 44 px touch targets, `aria-current`,
  reduced-motion); IpAssignmentDialog Enter-key submit fixed; Config Gen
  vendor selector becomes a true `tablist`; VLAN 1 → 10 in the "Home" template
  (security-pattern fix); `groupByPort` + `compressRanges` extracted to a
  shared `src/lib/config-gen/helpers.ts`; dead exports removed from
  `src/types/index.ts` and `src/lib/power/poe.ts`. Verdict + full disposition:
  `.plans/2026-04-18/R3-checkpoint-verdict.md`.

- **Phase 9 — plan wizard + recommendations engine + power + cable estimator**
  (2026-04-18, R3 v1.5 review **closed READY** 2026-04-18). Closes the v1.5
  decision-support surface:
  - **Plan wizard** at `/network-tools/plan-wizard` — 4-step guided flow
    (profile → recommended topology → VLAN + IP plan → review). Persists per
    step so users can save and resume; the apply step runs a single Prisma
    `$transaction` that creates rack + devices + VLANs + subnets atomically
    with re-checked tier limits
  - **Topology recommender** at `src/lib/plan/recommend-topology.ts` derives
    access-switch count (`ceil(devices × growth ÷ 24)`), firewall class, and
    AP count (`ceil(devices ÷ 25)`) from the profile
  - **Recommendations engine** at `src/lib/recommendations/` — pure function
    over a single-Promise.all `Snapshot`, returning derived alerts for rack
    fill, switch port fill, switch PoE budget, subnet IP fill, DHCP pool
    exhaustion, orphan VLANs, and unracked rackable devices. Cached per-user
    via `unstable_cache` with a 60-second TTL and `recommendations:{userId}`
    revalidation tag
  - **Recommendation dismissals** — `RecommendationDismissal` model persists
    permanent dismissals + 7-day snoozes, keyed by `(ruleKey, entityKey)`.
    Dashboard widget surfaces top 4; full feed at
    `/network-tools/recommendations` shows everything plus a dismissed
    sidebar with Restore controls
  - **Power calculator** at `/network-tools/power` — three panels: PoE budget
    (with configurable headroom factor), PDU sizing (NEC 80 % continuous
    rule), and UPS runtime in either Wh or Ah/V mode with usable-DoD + age
    derate sliders behind the AdvancedAccordion
  - **Cable estimator** at `/network-tools/cables` — table of cable runs with
    speed-aware reach checks against a `CABLE_LIMITS` constant table covering
    Cat5e/6/6a/7/8 + OM3/4/5 + OS2 + DAC passive/active. Outputs a snapped
    "buy length" (next standard length × 1.25 overage) and aggregates to a
    BoM card
  - **Networking glossary** gains `NEC 80 % rule`, `DoD`, `Inverter
    efficiency`, and `Build plan` entries
  - **Tier gate**: `canCreatePlan` (Free = 1 draft) added to `src/lib/tiers.ts`;
    Plan limit added to `getUsageSummary`
  - **Sidebar + palette**: Plan Wizard, Power, Cables, Recommendations
    surface in the Network Tools group; command palette gains 5 new entries
    (4 navigate, 1 create)
  - **Dashboard widget**: Recommendations widget sits next to Activity Feed,
    showing at most 4 alerts grouped by severity with a "View all" link
  - 22 new unit tests (8 evaluate-rules + 7 power + 7 cable + 4 topology) on
    top of the existing 44, targeting the math + threshold logic. Snapshot
    test rebalanced to assert on the `subnet:dhcp_pool` rule

### In flight / planned before public launch
- Phase 10 — teams / workspaces / RBAC
- Phase 11 — public REST API + API keys
- Phase 12 — export suite (PDF / CSV / SVG)
- Phase 13 — advanced audit log viewer
- Phase 14 — SSO via OIDC (SAML deferred — covers Google Workspace, Microsoft 365 / Azure AD, Okta, and most modern IdPs)
- Phase 15 — Stripe billing + hosted tier enablement
- Phase 16 — self-host paid licensing (signed JWT + fingerprint binding)
- Phase 17 — launch prep + final review gauntlet
- Phase 18 — 🚀 public launch

Review gauntlet (R1–R9) runs at phase boundaries. Framework:
[`.plans/2026-04-18/02-review-framework.md`](.plans/2026-04-18/02-review-framework.md).

## [Pre-release snapshot — 2026-04-18]

First public beta. Core product is functional; paid tiers and a few polish
items remain before GA.

### Added
- **Racks** — CRUD with drag-and-drop device placement, per-U validation,
  visual 10.86:1 faceplates with 9 brand palettes (Cisco, Ubiquiti, Dell,
  HP, Juniper, Arista, FS, TrippLite, custom).
- **Devices** — catalog-based and custom creation, CSV bulk import, inline
  mini-faceplate previews, search/filter/sort.
- **Network topology** — React Flow canvas with draggable nodes, wired edges
  colored by cable type, PNG export via `html-to-image`.
- **Auto-discovery** — nmap ping-scan against a CIDR, pending-host queue,
  approve/assign/ignore actions that become real devices.
- **Auth stack** (Better Auth)
  - Email + password sign-up/sign-in
  - Password reset by email with dev-mode console logger fallback
  - Email verification flow with a persistent dashboard banner
  - TOTP 2FA: QR-code enrollment, 10 backup codes, trust-device 30-day
    cookie, disable flow
  - GitHub + Google OAuth (optional — hidden when creds unset)
  - Sessions list with per-session revoke, sign-out-all, sign-out-others
  - Email change with confirmation to current address
  - Rate limits on login (5/15m), signup/reset/verification (3/1h), 2FA (5/5m)
- **Settings** — profile, security, preferences (default scan subnet,
  sidebar collapsed), 2FA management, audit log link, danger-zone account
  deletion with password + type-to-confirm.
- **Audit log** — every mutation records `action`, `entity`, `changes`,
  plus captured IP + user agent. Paginated reader at `/settings/audit`
  with filters; CSV export at `/api/audit/export`.
- **Dashboard activity feed** — last 10 events, relative timestamps,
  entity deep-links, empty state for new accounts.
- **Production deploy** — multi-stage Dockerfile, `docker-compose.prod.yml`,
  Postgres healthchecks, `prisma migrate deploy` on entrypoint, optional
  seed via `RACKSMITH_SEED=1`.
- **Security**
  - CSP, HSTS (prod), X-Frame-Options, X-Content-Type-Options,
    Referrer-Policy, Permissions-Policy
  - Per-user data isolation (`userId` filter on every query)
  - Zod validation on every server action + API route
- **Observability** — `/api/health` returns DB latency, migration count,
  uptime, version; returns `503` when DB is down.
- **UX polish** — global + route-scoped error boundaries, branded 404,
  loading skeletons for every slow route, QR-code PWA manifest, OG image
  via `next/og`, typed metadata template, session-scoped dismissable
  verify-email banner.
- **CI** — GitHub Actions with typecheck + unit tests + build on PRs,
  separate Playwright smoke-test job with artifact upload on failure.

### Not yet shipped (known limitations)
- Tier limits aren't enforced in code (landing page says Free = 3 racks).
- Rate-limit storage is in-memory (single-instance only).
- Paid self-hosting is deferred to Phase 16 (signed JWT + fingerprint binding).

### Infrastructure
- Next.js 16 (App Router, standalone output)
- Bun 1.x
- TypeScript 6, strict mode
- PostgreSQL 17 + Prisma 6
- Tailwind 4 (CSS-first)
- React Flow 12 for topology
- Better Auth 1.6 for auth
