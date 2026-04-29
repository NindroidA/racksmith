import "server-only";

import Stripe from "stripe";

import type { Plan } from "./tiers";

// ─── Stripe SDK client ──────────────────────────────────────────────
//
// Lazy-initialized + singleton across hot-reloads in dev (same pattern
// as Prisma). The Proxy defers client construction until the first
// property access — important because Next.js's "Collecting page data"
// build phase imports every server module under NODE_ENV=production
// without runtime secrets, and an eager throw at module-load would
// break CI builds. With the Proxy, the secret-key check runs at first
// API call (e.g. inside a route handler at request time, where envs
// are populated).
//
// API version is pinned so SDK upgrades don't silently change response
// shapes. Bump the literal here when intentionally migrating.

const STRIPE_API_VERSION = "2026-04-22.dahlia" as const;

declare global {
  // eslint-disable-next-line no-var
  var __racksmithStripe: Stripe | undefined;
}

function buildStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    // Production: surface a clear configuration error. This fires at
    // first API call (inside a request handler), not at module load,
    // so build-time imports don't trip it.
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "STRIPE_SECRET_KEY is required in production. Set it in .env.prod.",
      );
    }
    // Dev fallback — return a client with a placeholder so importing the
    // module doesn't crash before billing is configured locally. Any
    // actual API call still fails clearly with Stripe's invalid-key error.
    return new Stripe("sk_test_unconfigured", {
      apiVersion: STRIPE_API_VERSION,
      typescript: true,
    });
  }
  return new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
  });
}

function getStripeClient(): Stripe {
  if (!globalThis.__racksmithStripe) {
    globalThis.__racksmithStripe = buildStripeClient();
  }
  return globalThis.__racksmithStripe;
}

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    const client = getStripeClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

// ─── Webhook signing secret ─────────────────────────────────────────
//
// Throw clearly in production when unset — webhook handler can't verify
// signatures without it, and silently accepting unverified events is the
// classic Stripe footgun. Dev returns null so the route can early-exit
// before reaching this code path.

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "STRIPE_WEBHOOK_SECRET is required in production. Set it in .env.prod.",
      );
    }
    return "whsec_unconfigured";
  }
  return secret;
}

// ─── Price ID registry ──────────────────────────────────────────────
//
// Four prices: Pro Monthly, Pro Annual, Business Monthly, Business
// Annual. Test-mode and live-mode have different IDs — both env files
// must populate all four. Empty strings are tolerated in dev (UI hides
// upgrade buttons) but rejected in production at startup.

export type BillingCycle = "monthly" | "annual";
export type PaidTier = Extract<Plan, "pro" | "business">;

export type PriceKey = `${PaidTier}_${BillingCycle}`;

export const STRIPE_PRICE_IDS: Record<PriceKey, string> = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
  pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL ?? "",
  business_monthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? "",
  business_annual: process.env.STRIPE_PRICE_BUSINESS_ANNUAL ?? "",
};

export function isKnownPriceId(value: string): value is string {
  return Object.values(STRIPE_PRICE_IDS).some(
    (id) => id !== "" && id === value,
  );
}

/**
 * Reverse-lookup the (tier, cycle) pair for a Stripe price ID. Returns
 * null for unknown IDs so the webhook handler can surface unexpected
 * prices (e.g. a manually-edited subscription) as audit-only events
 * without crashing.
 */
export function lookupPriceId(
  priceId: string,
): { tier: PaidTier; cycle: BillingCycle } | null {
  for (const [key, id] of Object.entries(STRIPE_PRICE_IDS)) {
    if (id !== "" && id === priceId) {
      const [tier, cycle] = key.split("_") as [PaidTier, BillingCycle];
      return { tier, cycle };
    }
  }
  return null;
}

/**
 * Validate startup configuration. Called from server-side bootstrap to
 * surface misconfiguration early instead of at the first checkout.
 * Returns the list of missing keys; empty array means fully configured.
 */
export function getMissingStripeConfig(): string[] {
  const missing: string[] = [];
  if (!process.env.STRIPE_SECRET_KEY) missing.push("STRIPE_SECRET_KEY");
  if (!process.env.STRIPE_WEBHOOK_SECRET) missing.push("STRIPE_WEBHOOK_SECRET");
  if (!STRIPE_PRICE_IDS.pro_monthly) missing.push("STRIPE_PRICE_PRO_MONTHLY");
  if (!STRIPE_PRICE_IDS.pro_annual) missing.push("STRIPE_PRICE_PRO_ANNUAL");
  if (!STRIPE_PRICE_IDS.business_monthly)
    missing.push("STRIPE_PRICE_BUSINESS_MONTHLY");
  if (!STRIPE_PRICE_IDS.business_annual)
    missing.push("STRIPE_PRICE_BUSINESS_ANNUAL");
  return missing;
}
