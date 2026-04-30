import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "./prisma";
import { stripe } from "./stripe";

// ─── Business-tier seat reconciliation ──────────────────────────────
//
// Business plans bill per-seat. When a member is added or removed, we
// push the new seat count to the Stripe subscription item so the next
// invoice reflects reality. Pro and Free plans have no per-seat
// subscription — `syncSeatsForOrg` is a no-op for those.
//
// Concurrency: two admins adding members concurrently could each read
// the seat count, then race to update Stripe with stale numbers. We
// serialize via `pg_advisory_xact_lock` keyed on the org ID so the
// re-count + Stripe update happen under a per-org mutex. This requires
// the caller to be inside a transaction (the lock auto-releases at tx
// commit/rollback).
//
// Failure mode: we throw on Stripe failures so the caller's transaction
// rolls back the Member create/delete. If Stripe is down we'd rather
// reject the membership change than silently over- or under-bill.

type TenantTx = Prisma.TransactionClient;

const SEAT_LOCK_NAMESPACE = 71283; // arbitrary 32-bit constant; pairs with the org-id hash

export async function syncSeatsForOrg(
  tx: TenantTx,
  organizationId: string,
): Promise<void> {
  // Read the org's billing state inside the tx so we observe the same
  // committed view the caller's mutation just produced.
  const org = await tx.organization.findUnique({
    where: { id: organizationId },
    select: {
      plan: true,
      stripeSubscriptionId: true,
      stripeSubscriptionItemId: true,
      paymentStatus: true,
    },
  });
  if (!org) return;
  if (org.plan !== "business") return;
  if (!org.stripeSubscriptionId || !org.stripeSubscriptionItemId) {
    // Business plan without a subscription item is a misconfiguration —
    // log so it surfaces, but don't block the membership change.
    console.warn(
      "[stripe-seats] business org missing subscription linkage",
      { organizationId },
    );
    return;
  }
  // Cancelled subscriptions don't need a quantity update — Stripe will
  // refuse the call, and post-cancellation seat changes are irrelevant.
  if (org.paymentStatus === "canceled") return;

  // Serialize concurrent seat updates for this org. Same pattern as
  // `canCreate*Locked` — the lock auto-releases at tx commit/rollback.
  await tx.$queryRawUnsafe(
    "SELECT pg_advisory_xact_lock($1, hashtext($2))",
    SEAT_LOCK_NAMESPACE,
    organizationId,
  );

  // Re-count under the lock so simultaneous adds linearize.
  const seatCount = await tx.member.count({
    where: { organizationId },
  });

  // Push the new quantity to Stripe. Prorations are configurable; the
  // default ("create_prorations") creates a credit/debit on the next
  // invoice for the partial-period change, which is what most SaaS
  // customers expect.
  await stripe.subscriptionItems.update(org.stripeSubscriptionItemId, {
    quantity: seatCount,
    proration_behavior: "create_prorations",
  });
}

/**
 * Convenience wrapper: open a one-shot transaction just to run the
 * seat sync. Use when the caller didn't already have a tx open. Most
 * call sites already wrap mutations in `prisma.$transaction` and should
 * pass that tx into `syncSeatsForOrg` directly so the Stripe call rolls
 * back with the membership change on failure.
 */
export async function syncSeatsForOrgStandalone(
  organizationId: string,
): Promise<void> {
  await prisma.$transaction((tx) => syncSeatsForOrg(tx, organizationId));
}
