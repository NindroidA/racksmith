// Shared billing display constants — safe to import from both server
// and client modules. Lives outside `lib/stripe.ts` because that file
// imports the Stripe SDK and is marked "server-only", which would block
// client components (the upgrade cards) from reading the price labels.
//
// Stripe is the authority on the actual amount charged. These values
// are the customer-facing labels and must match the prices configured
// in the Stripe dashboard for the IDs in `lib/stripe.ts`. Update both
// sides together when changing pricing.

import type { Plan } from "./tiers";

export type BillingCycle = "monthly" | "annual";
export type PaidTier = Extract<Plan, "pro" | "business">;
export type PriceKey = `${PaidTier}_${BillingCycle}`;

export const PLAN_PRICING_USD: Record<PriceKey, number> = {
  pro_monthly: 9,
  pro_annual: 90,
  business_monthly: 29,
  business_annual: 290,
};
