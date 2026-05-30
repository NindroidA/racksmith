/**
 * Phase 13 smoke-test report generator.
 *
 * Inventories the screenshots taken during the smoke run, glues them
 * together with captions / findings / DB snapshots into a single HTML
 * page, then renders that page to a PDF via headless Chromium.
 *
 * Inputs:
 *   - test-artifacts/screenshots/2026-05-10-smoke/*.png  (screenshots)
 *   - /tmp/racksmith-smoke/db-final.txt                  (DB state)
 *
 * Output:
 *   - test-artifacts/screenshots/2026-05-10-smoke/REPORT.pdf
 *   - test-artifacts/screenshots/2026-05-10-smoke/REPORT.html  (also kept for browser viewing)
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const SCREENSHOT_DIR = resolve("test-artifacts/screenshots/2026-05-10-smoke");
const DB_TXT = "/tmp/racksmith-smoke/db-final.txt";
const HTML_OUT = join(SCREENSHOT_DIR, "REPORT.html");
const PDF_OUT = join(SCREENSHOT_DIR, "REPORT.pdf");

type Caption = {
  file: string;
  title: string;
  body: string;
};

// ── Caption map ─────────────────────────────────────────────────────
// Order = display order in the report. Each entry pairs a screenshot
// file with a 1-2 sentence description of what's being shown.

const CAPTIONS: Caption[] = [
  // P2 — Pro happy path
  {
    file: "p2-01-landing-pricing.png",
    title: "P2.01 — Landing /#pricing (signed-out)",
    body:
      "Pro and Business cards now show real CTAs ('Try Pro', 'Try Business') linking to /register with the next param URL-encoded (`/register?next=%2Fsettings%2Fbilling%3Ftier%3Dpro`). The bottom self-host paragraph reflects the locked-in hosted-only direction. Pricing math reads $9/$90 and $29/$290 with the 'save ~17%' line.",
  },
  {
    file: "p2-02-register-with-next.png",
    title: "P2.02 — /register?next=/settings/billing?tier=pro",
    body:
      "The 'Sign in' link at the bottom forwards the validated next param as `callbackURL=%2Fsettings%2Fbilling%3Ftier%3Dpro` (PR-E's bidirectional intent flow).",
  },
  {
    file: "p2-03-register-filled.png",
    title: "P2.03 — Register form filled",
    body: "Fresh email (smoke-pro-customer@racksmith.test) about to be submitted.",
  },
  {
    file: "p2-04-onboarding-welcome.png",
    title: "P2.04 — Onboarding auto-creates the personal org",
    body:
      "Pre-existing UX gap (not introduced by Phase 13): /onboarding/welcome unconditionally redirects to /dashboard, dropping the `next=/settings/billing?tier=pro` intent. Recommend follow-up to thread `next` through onboarding so the landing CTA truly lands on the upgrade card.",
  },
  {
    file: "p2-05-dashboard-with-verify-banner.png",
    title: "P2.05 — Dashboard with email-verify banner",
    body:
      "BA sent a verification email on sign-up (printed to dev stderr in the absence of RESEND_API_KEY). Banner is a separate component from the past-due banner.",
  },
  {
    file: "p2-06-billing-verify-email-gate-clean.png",
    title: "P2.06 — Billing page: 'Verify your email to upgrade'",
    body:
      "UpgradeOptions renders the verify-email gate (Q3 lock) when emailVerified is false. The user cannot proceed to Checkout without verifying first.",
  },
  {
    file: "p2-07-billing-pro-recommended.png",
    title: "P2.07 — 'You picked this' pill on Pro card",
    body:
      "After flipping emailVerified=true, the billing page renders with the Pro card highlighted (primary border + 'You picked this' pill) because the URL still carries `?tier=pro`. UpgradeOptions reads `recommendedTier` server-side.",
  },
  {
    file: "p2-08-checkout-error-bad-priceid.png",
    title: "P2.08 — Checkout fails: STRIPE_PRICE_* contains Product IDs, not Price IDs",
    body:
      "Server log: `createCheckoutSession({\"priceId\":\"prod_UQTrm6nbGuF15Y\"})`. Stripe Checkout requires Price IDs (`price_*`). All four STRIPE_PRICE_* slots in .env hold `prod_*` values. This is a configuration error in the deployment, not a code defect — but it is a real Phase 13 finding the smoke test surfaced. Fix: in the Stripe dashboard, for each Product, find the active Price ID and update .env (or .env.local) accordingly.",
  },
  // P3 — Failure / edge cases
  {
    file: "p3-01-past-due-banner.png",
    title: "P3.01 — Past-due banner (admin-only)",
    body:
      "After `stripe trigger invoice.payment_failed` (simulated via our signed-webhook script targeting the locally-recognized customer), the banner fires site-wide for the admin. Plan stays Pro (Q6 lock — no hard downgrade during Stripe Smart Retries).",
  },
  {
    file: "p3-02-plan-summary-past-due.png",
    title: "P3.02 — PlanSummaryCard during past-due",
    body:
      "Card derives cycle (Monthly) from stripePriceId via lookupPriceId, price ($9/mo, 'Flat rate, billed monthly') from PLAN_PRICING_USD, next-invoice from period_end. Payment-status row shows 'Past due — update card'. The PR-C label rename ('Monthly cost' → 'Price') is in place.",
  },
  // P4 — Business + seat sync
  {
    file: "p4-01-business-plan-summary.png",
    title: "P4.01 — Business plan summary with 1 seat",
    body:
      "$29/mo, '1 member × $29/mo'. Per-seat math computed server-side in billing/page.tsx.",
  },
  {
    file: "p4-02-business-two-seats.png",
    title: "P4.02 — Business plan summary with 2 seats",
    body:
      "$58/mo, '2 members × $29/mo'. Count is read at render time from prisma.member.count.",
  },
  {
    file: "p4-03-remove-member-after.png",
    title: "P4.03 — Remove-member attempt (Business org, bad Stripe linkage)",
    body:
      "Clicking Remove fails because syncSeatsForOrg tries to call stripe.subscriptionItems.update with a fake si_smoke_biz_001 ID. The transaction rolls back. Verified by DB query: member count still 2 after the click. PR-D's atomic-rollback property holds.",
  },
  {
    file: "p4-04-remove-toast.png",
    title: "P4.04 — Same state post-attempt",
    body: "Settings view re-rendered with the invitee still present in the member list.",
  },
  // P5 — Negative auth
  {
    file: "p5-01-member-no-billing-link.png",
    title: "P5.01 — Member-rank user: no Billing link in /settings",
    body:
      "Page does not contain `/settings/billing`. PR-D's admin-only sidebar gate verified.",
  },
  {
    file: "p5-02-member-direct-billing-attempt.png",
    title: "P5.02 — Member directly navigating to /settings/billing",
    body:
      "requireMember('admin') throws ForbiddenError → caught by error boundary → generic 'Something broke' (no information leakage). Denial works at the page level too.",
  },
  {
    file: "p5-03-unverified-email-gate.png",
    title: "P5.03 — Unverified-email admin sees verify-email gate",
    body:
      "Even with admin role, the upgrade flow is blocked until email is verified. Q3 lock enforced at the page render.",
  },
  {
    file: "p5-04-open-redirect-blocked.png",
    title: "P5.04 — Open-redirect attempt is sanitized",
    body:
      "`/register?next=//evil.example/phishing` renders normally, but the 'Sign in' link points to plain `/login` (not `/login?callbackURL=//evil…`). sanitizeNextPath collapsed the protocol-relative value to the /dashboard fallback. Same fallback applies on signup submit.",
  },
];

// ── Findings + summary ──────────────────────────────────────────────

const FINDINGS = `
<h2>Findings</h2>

<h3 class="finding ok">✓ Code working as designed</h3>
<ul>
  <li><strong>HMAC signature verification:</strong> 400 returned for missing signature; 400 returned for tampered signature (no detail leak per PR-C fix).</li>
  <li><strong>Idempotency / replay:</strong> same event id sent twice → first <code>{received: true}</code>, second <code>{received: true, replay: true}</code>. DB has exactly one row in StripeEvent.</li>
  <li><strong>No-customer event:</strong> webhook returns 200, StripeEvent row written with errorMessage 'No organization for customer …'. Stripe stops retrying.</li>
  <li><strong>Unknown priceId:</strong> webhook returns 200, errorMessage 'Unknown priceId on subscription — plan not flipped'. Org plan and stripePriceId are NOT touched.</li>
  <li><strong>Payment cycle:</strong> payment_failed → paymentStatus=past_due (plan stays Pro); payment_succeeded → paymentStatus=active again. Q6 lock holds.</li>
  <li><strong>Subscription deleted:</strong> plan downgraded to free, paymentStatus=canceled, Stripe linkage cleared (stripeSubscriptionId/Item/Price all null).</li>
  <li><strong>Refund:</strong> audit row written with amount + stripeChargeId. No plan change (audit-only per the design).</li>
  <li><strong>Past-due banner:</strong> renders for admin/owner only; copy includes plan label; CTA reaches createPortalSession.</li>
  <li><strong>PlanSummaryCard:</strong> derives cycle from stripePriceId, price from PLAN_PRICING_USD, next-invoice from planExpiresAt. Per-seat math correct (1×$29, 2×$58).</li>
  <li><strong>Member-rank gating:</strong> no Billing link in sidebar settings; direct navigation hits error boundary (generic message).</li>
  <li><strong>Email-verify gate:</strong> 'Verify your email to upgrade' shown to admin without emailVerified=true.</li>
  <li><strong>Open-redirect defense:</strong> <code>/register?next=//evil.example</code> falls back to /dashboard; sign-in link does not echo the bad value.</li>
  <li><strong>Audit log:</strong> 5 billing rows over the lifecycle (created → failed → succeeded → refunded → deleted), all with <code>metadata.actor = "system"</code>.</li>
</ul>

<h3 class="finding warn">⚠ Real bugs / config issues discovered</h3>
<ul>
  <li><strong>.env STRIPE_PRICE_* slots contain Product IDs.</strong> All four (PRO_MONTHLY, PRO_ANNUAL, BUSINESS_MONTHLY, BUSINESS_ANNUAL) are <code>prod_*</code>. Stripe Checkout rejects these immediately. Fix in dashboard → Products → Prices, copy the <code>price_*</code> IDs into env. Blocks all live checkout flows.</li>
  <li><strong>Onboarding drops the ?next= param.</strong> Landing → 'Try Pro' → /register → signup → /onboarding/welcome → /dashboard, losing the intent. The 'You picked this' highlight on the upgrade card therefore only fires if the user manually navigates to /settings/billing?tier=pro. Suggested fix: thread <code>next</code> through onboarding/welcome and use it as the post-redirect target when set + valid.</li>
  <li><strong>BA rate limit (3 signups / hour) tripped during seeding.</strong> Worked around by registering users via direct Prisma + scrypt hash. In production this isn't a problem (real users aren't signing up at >3/hr from one IP), but it caught us during the test setup.</li>
</ul>

<h3 class="finding warn">⚠ Test coverage gaps (smoke test limitations, not code bugs)</h3>
<ul>
  <li><strong>Real Stripe Checkout was not exercised end-to-end</strong> due to the .env config issue above. Skipped flows: actual card-in-iframe submission, real customer creation, real subscription lifecycle without simulation.</li>
  <li><strong>Customer Portal was not opened</strong> for the same reason — no real Stripe subscription to manage. PlanSummaryCard's 'Manage billing' button is present and clickable; the createPortalSession action's auth gates were verified separately by the unit suite.</li>
  <li><strong>Live-mode smoke on prizmo</strong> remains as documented in docs/INTERNAL_DEPLOY.md §6.7 — to be done manually with a real card after the .env Price-ID fix.</li>
</ul>

<h2>Recommendations (next steps)</h2>
<ol>
  <li><strong>Fix .env STRIPE_PRICE_* values.</strong> Stripe dashboard → Products → each Product → 'Add price' or copy the existing price's <code>price_…</code> id. Update .env, restart dev. Re-run this smoke test to clear the P2.08 finding.</li>
  <li><strong>Thread <code>next</code> through onboarding/welcome.</strong> Small fix in <code>src/app/onboarding/welcome/page.tsx</code>: read <code>?next=</code>, validate via <code>sanitizeNextPath</code>, use as the post-org-create redirect target instead of unconditionally going to /dashboard. The landing 'You picked this' pill currently can't fire without this fix.</li>
  <li><strong>Once .env is fixed, run the full live-mode smoke on prizmo per the runbook.</strong> All other surfaces are validated.</li>
</ol>
`;

// ── HTML assembly ───────────────────────────────────────────────────

function loadDbSnapshot(): string {
  try {
    const raw = readFileSync(DB_TXT, "utf8");
    return raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  } catch {
    return "(DB snapshot not found at " + DB_TXT + ")";
  }
}

function imgTag(file: string): string {
  const path = join(SCREENSHOT_DIR, file);
  try {
    const stat = statSync(path);
    if (!stat.isFile()) throw new Error("not a file");
  } catch {
    return `<div class="missing">(screenshot not captured: ${file})</div>`;
  }
  // Embed as base64 so the PDF is self-contained.
  const b64 = readFileSync(path).toString("base64");
  return `<img alt="${file}" src="data:image/png;base64,${b64}" />`;
}

function captionHtml(c: Caption): string {
  return `
  <section class="cap">
    <h3>${c.title}</h3>
    <p>${c.body}</p>
    ${imgTag(c.file)}
  </section>`;
}

function buildHtml(): string {
  const now = new Date().toISOString();
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>RackSmith Phase 13 Smoke-Test Report</title>
  <style>
    @page { size: A4 portrait; margin: 18mm 16mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      color: #111;
      line-height: 1.45;
      font-size: 11pt;
    }
    h1 { font-size: 22pt; margin: 0 0 4pt; }
    h2 { font-size: 14pt; margin: 24pt 0 6pt; border-bottom: 1px solid #ddd; padding-bottom: 4pt; }
    h3 { font-size: 12pt; margin: 14pt 0 4pt; }
    .meta { color: #555; font-size: 10pt; margin-bottom: 16pt; }
    .cap { margin: 18pt 0; page-break-inside: avoid; }
    .cap img { display: block; max-width: 100%; border: 1px solid #ccc; margin-top: 6pt; }
    .missing { padding: 14pt; background: #fff6e0; border: 1px dashed #c98; color: #944; }
    code { background: #f4f4f4; padding: 1pt 4pt; border-radius: 3px; font-size: 10pt; }
    pre { background: #f4f4f4; padding: 10pt; border-radius: 4px; overflow-x: auto; font-size: 9.5pt; line-height: 1.35; }
    ul, ol { margin: 6pt 0 10pt 18pt; }
    li { margin-bottom: 4pt; }
    .finding { font-weight: 600; }
    .finding.ok { color: #156c2e; }
    .finding.warn { color: #a85d00; }
    .toc { background: #f7f7f7; border: 1px solid #e0e0e0; padding: 10pt 16pt; border-radius: 4px; margin: 12pt 0 20pt; }
    .toc ol { margin: 0 0 0 18pt; }
  </style>
</head>
<body>
  <h1>RackSmith — Phase 13 Smoke-Test Report</h1>
  <div class="meta">
    Local dev + Stripe test mode &middot; Generated ${now} &middot; Driver: Playwright (Chromium) + signed-webhook simulator.
  </div>

  <div class="toc">
    <strong>Contents</strong>
    <ol>
      <li>Summary &amp; environment</li>
      <li>P2 — Pro happy path (landing → register → billing gate → bad-price discovery)</li>
      <li>P3 — Failure / edge cases (signature, replay, past-due, recovery, unknown price, refund, deleted)</li>
      <li>P4 — Business tier (PlanSummaryCard per-seat math, removeMember rollback)</li>
      <li>P5 — Negative auth (member rank, unverified email, open-redirect)</li>
      <li>DB final state (StripeEvent + AuditLog)</li>
      <li>Findings + recommendations</li>
    </ol>
  </div>

  <h2>1. Summary &amp; environment</h2>
  <p>
    Goal: exercise every surface added by Phase 13 (Stripe billing) end-to-end against a local dev server,
    Stripe in test mode, without touching real money or prizmo. Coverage: Pro happy-path UI thru the
    pre-checkout gate, all six webhook event types via HMAC-signed simulation, Business per-seat math,
    real-time seat-sync rollback behavior, and negative-auth paths.
  </p>
  <p>
    Services running for this run:
  </p>
  <ul>
    <li><code>bun dev</code> on http://localhost:3000 (Next.js 16 App Router, Bun runtime).</li>
    <li><code>stripe listen --forward-to localhost:3000/api/webhooks/stripe</code> with its dynamic <code>whsec_*</code> overriding the .env value via .env.local.</li>
    <li><code>scripts/smoke-webhook.ts</code> for signed-event simulation (Phase 3 + a few Phase 4 setup events).</li>
    <li>Playwright Chromium driving the UI for everything visible.</li>
  </ul>

  <h2>2. P2 — Pro happy path</h2>
  ${CAPTIONS.slice(0, 8).map(captionHtml).join("\n")}

  <h2>3. P3 — Failure &amp; edge cases (webhook simulation)</h2>
  <p>
    All six event types in scope were exercised via <code>scripts/smoke-webhook.ts</code>, which signs payloads
    with the same secret the dev server validates against. Negative cases (missing signature, tampered signature)
    plus the no-customer and unknown-priceId branches were also tested. Results inline in the captions and
    visualized in screenshots P3.01–P3.02.
  </p>
  ${CAPTIONS.slice(8, 10).map(captionHtml).join("\n")}

  <h2>4. P4 — Business tier &amp; seat sync</h2>
  ${CAPTIONS.slice(10, 14).map(captionHtml).join("\n")}

  <h2>5. P5 — Negative auth paths</h2>
  ${CAPTIONS.slice(14).map(captionHtml).join("\n")}

  <h2>6. DB final state</h2>
  <p>Snapshot of <code>StripeEvent</code>, <code>AuditLog</code> billing rows, and smoke fixture orgs after the full run:</p>
  <pre>${loadDbSnapshot()}</pre>

  ${FINDINGS}

</body>
</html>`;
}

// ── Render ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const html = buildHtml();
  writeFileSync(HTML_OUT, html);
  console.log(`Wrote ${HTML_OUT} (${(html.length / 1024).toFixed(1)} KB)`);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto("file://" + HTML_OUT, { waitUntil: "load" });
  // Give base64 <img> tags a beat to decode before printing.
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.pdf({
    path: PDF_OUT,
    format: "A4",
    printBackground: true,
    margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
  });
  await browser.close();

  const pdfStat = statSync(PDF_OUT);
  console.log(`Wrote ${PDF_OUT} (${(pdfStat.size / 1024).toFixed(1)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
