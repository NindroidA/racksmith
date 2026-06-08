# RackSmith — Roadmap

> A menu of candidate features, tools, and platform work — gathered from a full
> codebase audit (2026-06-06) and grounded in the shipped surfaces. Ordered by
> value ÷ effort. **Not commitments** — a backlog to pull from. **[value/effort]**,
> effort = S/M/L.

**Positioning guardrail:** "NetBox is overkill, draw.io is too manual — RackSmith
is the beautiful middle ground." Hosted-only v1; homelabbers, small IT teams, MSPs.
Every item should make the tool *more beautiful, more useful, or more sticky* for
those three segments without drifting into NetBox territory.

---

## 🥇 Near-term, high-leverage

The biggest wins for launch + early adoption (high value, mostly medium effort).

- **Rack elevation PDF / print export** [high/M] — one-click "Print rack" → clean front-elevation diagram (U positions, labels, color tags) + a device BoM. The #1 thing homelabbers screenshot and share.
- **Cable & device label-sheet generator (printable + QR)** [high/M] — Avery-style label sheets for devices + cable ends (source→target port, type, length), optional QR linking back to the device. A "real datacenter tool" signal.
- **NetBox & generic-CSV importer (migration on-ramp)** [high/L] — ingest a NetBox export (REST/CSV) + a column-mapping CSV flow for devices/racks/subnets/VLANs. The single biggest adoption unlock — lets people *leave NetBox*.
- **Public read-only share links for racks & topology** [high/M] — tokenized `/share/[token]` rendering a read-only rack elevation or topology, no login, revocable. Viral loop + the "show off my rack" use case.
- **Global Cmd-K entity search** [high/M] — extend the command palette beyond nav to search racks/devices/IPs/MACs/subnets/VLANs/connections with deep-links. (The palette already exists — add the index.)
- **Discovery: open ports → services + auto-suggest type** [med/S] — the nmap scan can capture ports; map common ones (SSH/HTTP/SMB/Proxmox/…) to service labels and use them to guess device type. Low effort, visible win. *(Builds on the MAC/vendor capture already shipped.)*

## 🥈 Mid-term features

- **Sites & locations hierarchy (multi-site for MSPs)** [high/L] — promote rack `location` from free-text to a first-class Site entity (address, contact, notes); racks/devices nest under sites; dashboards roll up per-site. Unlocks the MSP segment.
- **Warranty / lifecycle / EOL tracking** [med/M] — purchase date, warranty-expiry, serial, asset tag on devices + a recommendation rule flagging out-of-warranty/EOL gear.
- **Bulk operations across inventory** [med/M] — multi-select on device/rack/IPAM lists → bulk move/assign-VLAN/tag/delete/export.
- **Entity history & diff timeline** [med/M] — per-entity "History" tab rendering `AuditLog.changes` as human-readable before/after (the data already exists org-wide).
- **IPAM subnet visualizer (capacity heatmap)** [med/M] — used/free/reserved/DHCP grid with hover + one-click assign on a free address.
- **More config-gen targets + bundle export** [med/M] — MikroTik RouterOS, pfSense/OPNsense, Juniper; export all org configs as one bundle.
- **Infrastructure analytics dashboard** [med/M] — charts over time: rack/power/port utilization, IP/subnet exhaustion trends, device-type breakdown, growth.
- **Scheduled / recurring discovery scans with change diffs** [med/L] — daily/weekly per-subnet scans + a "since last scan" diff (new/gone hosts, changed ports/MAC).
- **Template marketplace / community blueprints** [med/M] — grow the templates into a browsable library of full build blueprints ("Proxmox 3-node cluster", "UniFi home network").
- **Scan-complete & lifecycle notifications (email + webhooks)** [med/M] — notify on scan-complete, tier-limit-approaching, past-due, invite-accepted (Resend + outbound webhooks).
- **PWA / installable mobile read-app** [med/M] — manifest + offline shell + mobile read view for looking up a device in the rack room. *(Builds on the mobile-shell + rack-touch work shipped.)*
- **AI-assisted plan drafting & cleanup** [med/L] — turn a plain-English description into a draft BuildPlan via the plan-wizard; review existing infra for issues.

## 🥉 Longer-term / niche

- **REST API SDKs + outbound webhook events** [med/M] — typed TS (+ thin Python) client generated from the OpenAPI 3.1 spec; `device.created`/`rack.updated`/… webhooks.
- **Public org-status / inventory page (embeddable)** [low/M] — opt-in read-only org summary for the "share my setup" crowd.
- **i18n scaffolding (next-intl)** [low/L] — extract strings to catalogs, ship `en` first.
- **OIDC / SSO for Teams + Business** [med/L] — Better Auth generic-OAuth/OIDC plugin (landing copy promises "OIDC at launch" — decide in/defer). *Launch-scope decision.*
- **Self-host licensing + offline scan engine** [low/L] — pre-scope the license-key module + env surface; deferred pending post-launch demand.

---

## 🛠 Platform / technical (reliability before scale)

- **Durable background-job queue for discovery scans** [high/L] — `POST /api/discovery/scan` fires the scan fire-and-forget; a crash mid-scan orphans the `DiscoveryScan` row in `running` forever. Move to a durable job (Vercel Queues / a worker) with timeout + recovery.
- **Retention / pruning for ApiRequestLog + AuditLog** [high/M] — both grow unbounded (ApiRequestLog *is* the rate-limit store). Add a retention policy + pruning job.
- **Structured logger + error tracking (Sentry / OTel)** [high/M] — replace scattered `console.error/warn` with a logging abstraction + request correlation + an error tracker.
- **Make the integration suite CI-runnable** [high/M] — the Postgres-backed RLS/contract/tier/rate-limit suite is local-only (needs the restricted `racksmith_test_app` role). Stand it up in CI so multi-tenant isolation is gated on every PR.
- **Server-action unit-test backfill** [high/L] — every dashboard `actions.ts` (the mutation surface) is under-tested; the deferred big test lift. *(Pure-lib unit coverage is now ~81%; this is the DB-heavy remainder.)*
- **Env-var schema validation at boot** [med/S] — validate the ~18 env vars (Stripe/OAuth/Resend/nmap/etc.) with Zod at startup; fail fast.
- **Async/streaming exports for large tenants** [med/M] — audit/IPAM/org-export build the full payload in one request; stream/paginate for Business scale.
- **DB index audit on hot paths** [med/S] — audit the dashboard fan-out + list pages for missing composite indexes / N+1 while data is small.
- **Prometheus `/metrics` endpoint** [med/M] — request counts/latency by route, rate-limit rejections, scan durations (the `/api/health` probe is already solid).
- **Replace scan-progress polling with SSE** [med/M] — `active-scan-card` polls on an interval; a single SSE stream is cleaner + cheaper.
- **Public REST API → GA** [med/M] — define the contract/deprecation/sunset policy; promote from `1.0.0-beta`.
- **Accessibility CI gate** [med/M] — CLAUDE.md mandates strong a11y conventions but nothing enforces them; add automated (axe) checks.
- **Generated type-safe API client SDK** [low/M] — ship a typed TS client from the OpenAPI spec (also useful for internal e2e).
- **Advisory lock on the rate-limit check-and-record** [low/S] — `checkAndRecord` aggregates-then-inserts without a `pg_advisory_xact_lock` on `apiKeyId`; two same-ms requests can both pass the cap.

---

## 🧹 Code-quality / internal consistency (from the 2026-06-08 subjective review)

Non-blocking refactors surfaced by the 20-dimension blind review (overall
health 86.7/100). The genuine correctness/authorization findings were fixed
directly (see note below); these are the deferred *consistency* items —
each is safe to skip but each nudges a quality dimension upward.

- **Partition `src/components/network-tools/`** [low/M] — one flat 24-file drawer spans 7 sub-domains (IPAM, VLANs, plan-wizard, power, cable, config-gen, recommendations) while the route side and every sibling component domain nest by feature. Mirror the route structure (hoist `ipam/` + `vlans/` to their own folders). *(high_level_elegance + package_organization)*
- **Group the `src/lib/` root** [low/M] — 28 mixed-concern files sit beside 10 well-grouped subfolders. Cluster the 5-file Stripe/billing set (`stripe.ts`, `stripe-events.ts`, `tiers.ts`-adjacent) into `lib/billing/`, and decide a home rule for new helpers. *(high_level_elegance + package_organization)*
- **Split `organization-section.tsx`** [low/M] — 851 LOC bundling 5 distinct admin panels + 18 hooks into one component; extract per-panel (members, invites, transfer, rename, danger-zone). *(design_coherence)*
- **Unify the `lib/` barrels** [low/S] — barrels exist for only 3/10 domains and are bypassed by deep imports even where they exist (`ip/index.ts` is a behavior-free `export *` used inconsistently). Either commit to barrels per domain or drop them. *(convention_outlier + abstraction_fitness)*
- **Migrate `vlan-form.tsx` to the `useReducer` form pattern** [low/S] — the lone entity form still on raw `useState` while device/rack/subnet forms moved to a typed `FormState` + `formReducer` + `buildInitial`. Also align `connection-form`'s `{field,value}` reducer action with the siblings' `{payload}` shape. *(low_level_elegance + design_coherence)*
- **DRY the repeated async-handler skeleton** [low/S] — `two-factor-section.tsx` has 4 near-identical `setLoading/try/result-check/finally` handlers; extract a local `run2FA` helper. *(low_level_elegance)*
- **DRY the CSV export envelope** [low/S] — both CSV export routes hand-roll the same header+rows+Response assembly; and Date→ISO translation is via a serializer on v1 routes but inline on discovery/export routes. Share both. *(mid_level_elegance)*
- **Lazy `STRIPE_PRICE_IDS` getter** [low/S] — currently an import-time `process.env` snapshot, inconsistent with the same file's deliberate call-time secret-key handling and forcing `vi.resetModules()` ceremony in tests. Mirror `getStripeClient()`. *(initialization_coupling)*  ⚠️ *touches billing — sequence after live-mode Stripe verification.*
- **Use `roleHasAccess` in `organization-section.tsx`** [low/S] — client capability checks are hardcoded inline instead of the shared `roleHasAccess` helper (display-only; server enforcement is already correct). *(authorization_consistency)*
- **Tighten React Flow / DropPayload typing** [low/S] — topology node/edge components use `as unknown as` instead of React Flow's typed generic; the rack drag handler casts `JSON.parse` straight to the `DropPayload` union without validating the discriminant. *(type_safety)*
- **Test backfill for untested critical paths** [med/L] — `scan-completion.ts` (discovery reconciliation) and `organization-export.ts` (pre-delete backup) have zero direct tests. *(test_strategy — complements the dashboard server-action backfill already listed above)*

---

*Generated from the 2026-06-06 pre-launch audit (37 candidates across 9 review agents) and refreshed by the 2026-06-08 subjective review (20 dimensions, overall 86.7/100). The launch-blocking UI/correctness/mobile/discovery items were fixed in PRs #35–#38; the review's authorization (`deleteScan`/`deleteBuildPlan` admin-rank, onboarding audit), dead-dependency, type-correctness, naming, and docstring findings were fixed in the follow-up review-findings PR — not tracked here.*
