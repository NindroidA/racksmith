import "server-only";

import type Stripe from "stripe";

import type { Plan } from "./tiers";
import { lookupPriceId } from "./stripe";

// ─── Subscription → plan derivation ─────────────────────────────────
//
// Stripe.Subscription has a list of items (almost always 1 for our
// flat-fee + per-seat model). Each item carries a Price; we look that
// up against STRIPE_PRICE_IDS to derive the RackSmith plan name. An
// unrecognized price (e.g. someone manually attached a price in the
// Stripe dashboard) returns null — the caller logs the event and
// short-circuits without flipping the plan.

export function derivePlanFromSubscription(
  subscription: Stripe.Subscription,
): Plan | null {
  const item = subscription.items.data[0];
  if (!item) return null;
  const priceId = item.price.id;
  const lookup = lookupPriceId(priceId);
  return lookup?.tier ?? null;
}

// ─── Stripe.Subscription.status → RackSmith paymentStatus ───────────
//
// Stripe statuses: incomplete, incomplete_expired, trialing, active,
// past_due, canceled, unpaid, paused. We collapse them into the four
// values our DB stores. Trialing maps to active (we don't ship trials
// at v1, but if Stripe sends one through portal config, treat as paid).

export type PaymentStatus = "active" | "past_due" | "canceled" | "incomplete";

export function mapSubscriptionStatus(
  status: Stripe.Subscription.Status,
): PaymentStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
    case "paused":
      return "canceled";
    case "incomplete":
      return "incomplete";
  }
}

// ─── Subscription period_end → planExpiresAt ────────────────────────
//
// Stripe sends `current_period_end` as a Unix timestamp (seconds since
// epoch). Convert to a JS Date in milliseconds. Returns null when the
// subscription has no period (defensive — shouldn't happen for
// recurring subs but Stripe's typing is permissive).
//
// `current_period_end` lives on the subscription's first item in the
// 2026-04 SDK, so we read it from there. Falls back to subscription
// itself for older API versions defensively.

type SubscriptionWithLegacyPeriod = Stripe.Subscription & {
  current_period_end?: number;
};

export function planExpiresAtFromSubscription(
  subscription: Stripe.Subscription,
): Date | null {
  const item = subscription.items.data[0];
  const periodEnd =
    item?.current_period_end ??
    (subscription as SubscriptionWithLegacyPeriod).current_period_end;
  if (typeof periodEnd !== "number" || periodEnd <= 0) return null;
  return new Date(periodEnd * 1000);
}
