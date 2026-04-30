import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { audit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { stripe, getStripeWebhookSecret } from "@/lib/stripe";
import {
  attachStripeEventOrg,
  clearStripeEvent,
  markStripeEventError,
  recordStripeEvent,
} from "@/lib/stripe-events";
import {
  derivePlanFromSubscription,
  mapSubscriptionStatus,
  planExpiresAtFromSubscription,
} from "@/lib/stripe-helpers";
import { withTenant } from "@/lib/prisma-tenant";

export const dynamic = "force-dynamic";
// Webhooks must consume the raw body for HMAC verification — Next.js's
// default body parsing would mutate (or reorder JSON keys) and break
// the signature check. Reading via req.text() bypasses any parsing.
export const runtime = "nodejs";

// ─── Webhook entry ──────────────────────────────────────────────────
//
// Stripe POSTs every event to this endpoint. Order of operations:
//
//   1. Read raw body
//   2. Verify HMAC via Stripe's SDK helper using STRIPE_WEBHOOK_SECRET
//      — silent acceptance of unverified events is the classic Stripe
//      footgun, so failure here returns 400 immediately.
//   3. recordStripeEvent — atomic dedupe via the unique constraint on
//      StripeEvent.id. Returns alreadyProcessed=true on replay; we
//      short-circuit with 200 so Stripe stops retrying.
//   4. Resolve organizationId from event.data.object.customer.
//   5. Dispatch on event.type and apply the DB transition inside
//      withTenant(organizationId, ...).
//   6. Audit the resulting state change.
//   7. Return 200.
//
// On unexpected errors mid-handler, clear the StripeEvent row so
// Stripe's retry can re-enter the handler cleanly. Soft failures (e.g.
// unresolvable customer) keep the row + errorMessage so we don't loop.

export async function POST(req: Request): Promise<Response> {
  // 1. Raw body
  const rawBody = await req.text();

  // 2. Signature verification
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret(),
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: "Signature verification failed",
        detail: err instanceof Error ? err.message : "unknown",
      },
      { status: 400 },
    );
  }

  // 3. Dedupe — atomic insert keyed on event.id
  const dedupe = await recordStripeEvent(event);
  if (dedupe.alreadyProcessed) {
    // Stripe will stop retrying on 200. The earlier processing already
    // applied the effect; replay is safe.
    return NextResponse.json({ received: true, replay: true });
  }

  // 4. Resolve organizationId from event payload. The customer ID
  //    lives on different fields per event type — handle the union.
  const customerId = extractCustomerId(event);
  if (!customerId) {
    await markStripeEventError(event.id, "No customer ID on event payload");
    return NextResponse.json({ received: true, resolved: false });
  }
  const org = await prisma.organization.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  });
  if (!org) {
    // Webhook fired for a customer that doesn't belong to any org we
    // know about (manual dashboard creation, deleted org, etc.).
    // Mark + return 200 so Stripe stops retrying — retrying won't help.
    await markStripeEventError(
      event.id,
      `No organization for customer ${customerId}`,
    );
    return NextResponse.json({ received: true, resolved: false });
  }
  await attachStripeEventOrg(event.id, org.id);

  // Resolve a real userId for audit attribution. AuditLog.userId is a
  // non-null FK to User; webhook-driven events are still attributed to
  // the org's owner with metadata.actor = "system" so the audit trail
  // can distinguish billing-system writes from user actions.
  const owner = await prisma.member.findFirst({
    where: { organizationId: org.id, role: "owner" },
    select: { userId: true },
  });
  const actorUserId = owner?.userId;
  if (!actorUserId) {
    await markStripeEventError(
      event.id,
      `Organization ${org.id} has no owner — cannot attribute audit row`,
    );
    return NextResponse.json({ received: true, audited: false });
  }

  // 5. Dispatch
  try {
    await dispatchEvent(event, org.id, actorUserId);
    return NextResponse.json({ received: true });
  } catch (err) {
    // Transient failure (DB unavailable, Stripe API failure mid-handler).
    // Clear the StripeEvent row so Stripe's retry re-enters cleanly.
    await clearStripeEvent(event.id).catch(() => undefined);
    console.error("[stripe-webhook] dispatch failed", {
      eventId: event.id,
      type: event.type,
      err,
    });
    return NextResponse.json(
      { error: "Internal error processing webhook" },
      { status: 500 },
    );
  }
}

// ─── Customer ID extraction ─────────────────────────────────────────
//
// Subscription / Invoice / Charge all carry a `customer` field, but
// Stripe's TypeScript types model it as `string | null | Customer | DeletedCustomer`.
// We need the string ID; expand-mode is never used by us.

function extractCustomerId(event: Stripe.Event): string | null {
  const obj = event.data.object as { customer?: unknown };
  if (typeof obj.customer === "string") return obj.customer;
  if (
    obj.customer &&
    typeof obj.customer === "object" &&
    "id" in obj.customer &&
    typeof (obj.customer as { id?: unknown }).id === "string"
  ) {
    return (obj.customer as { id: string }).id;
  }
  return null;
}

// ─── Per-event-type dispatch ────────────────────────────────────────
//
// All DB writes wrap in withTenant(organizationId) so RLS is engaged.
// Each transition calls audit() with a verb from the AuditAction union
// so the audit log is the source of truth for billing-state changes.

async function dispatchEvent(
  event: Stripe.Event,
  organizationId: string,
  actorUserId: string,
): Promise<void> {
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await applySubscriptionState(sub, organizationId, actorUserId, event);
      return;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await applySubscriptionDeletion(sub, organizationId, actorUserId, event);
      return;
    }
    case "invoice.payment_failed": {
      await applyPaymentStatus(organizationId, "past_due", actorUserId, event);
      return;
    }
    case "invoice.payment_succeeded": {
      await applyPaymentStatus(organizationId, "active", actorUserId, event);
      return;
    }
    case "charge.refunded": {
      // Audit-only — refund doesn't auto-cancel the sub. The same
      // billing cycle continues; the user keeps Pro/Business until
      // their next subscription event.
      const charge = event.data.object as Stripe.Charge;
      await audit({
        userId: actorUserId,
        organizationId,
        action: "payment_refunded",
        entityType: "subscription",
        entityId: charge.id,
        changes: {
          amount: charge.amount_refunded,
          currency: charge.currency,
          stripeChargeId: charge.id,
        },
        metadata: { actor: "system", stripeEventId: event.id },
      });
      return;
    }
    default:
      // Unsubscribed event types arrive only if someone reconfigures
      // the Stripe webhook endpoint to send more than the 6 we ask
      // for. Log and ignore — don't fail the request.
      await markStripeEventError(
        event.id,
        `Unhandled event type ${event.type}`,
      );
  }
}

// ─── Subscription created/updated ───────────────────────────────────
//
// Same effect for both event types: read the post-update state from
// the payload (Stripe doesn't guarantee event order — re-deriving from
// the payload avoids drift) and stamp it onto Organization.

async function applySubscriptionState(
  sub: Stripe.Subscription,
  organizationId: string,
  actorUserId: string,
  event: Stripe.Event,
): Promise<void> {
  const plan = derivePlanFromSubscription(sub);
  if (!plan) {
    // Unknown price ID — keep audit trail but don't touch the plan
    // (we can't safely guess what tier the customer expected).
    await markStripeEventError(
      event.id,
      "Unknown priceId on subscription — plan not flipped",
    );
    return;
  }
  const paymentStatus = mapSubscriptionStatus(sub.status);
  const planExpiresAt = planExpiresAtFromSubscription(sub);
  const stripeSubscriptionItemId = sub.items.data[0]?.id ?? null;
  const stripePriceId = sub.items.data[0]?.price.id ?? null;

  await withTenant(organizationId, async (tx) => {
    await tx.organization.update({
      where: { id: organizationId },
      data: {
        plan,
        planExpiresAt,
        paymentStatus,
        stripeSubscriptionId: sub.id,
        stripeSubscriptionItemId,
        stripePriceId,
      },
    });
  });

  await audit({
    userId: actorUserId,
    organizationId,
    action:
      event.type === "customer.subscription.created"
        ? "subscription_created"
        : "subscription_updated",
    entityType: "subscription",
    entityId: sub.id,
    changes: {
      plan,
      paymentStatus,
      planExpiresAt,
      stripeSubscriptionId: sub.id,
    },
    metadata: { actor: "system", stripeEventId: event.id },
  });
}

// ─── Subscription deleted ───────────────────────────────────────────
//
// Stripe has fully cancelled the subscription (after dunning retries
// exhausted, or user-initiated cancel reached period end). Per Q6 lock
// in the design doc: hard downgrade to free, preserve existing data
// (existing rows over the Free cap remain — only new creates are
// blocked, which canCreate*Locked already enforces).

async function applySubscriptionDeletion(
  sub: Stripe.Subscription,
  organizationId: string,
  actorUserId: string,
  event: Stripe.Event,
): Promise<void> {
  await withTenant(organizationId, async (tx) => {
    await tx.organization.update({
      where: { id: organizationId },
      data: {
        plan: "free",
        paymentStatus: "canceled",
        planExpiresAt: new Date(),
        stripeSubscriptionId: null,
        stripeSubscriptionItemId: null,
        stripePriceId: null,
      },
    });
  });

  await audit({
    userId: actorUserId,
    organizationId,
    action: "subscription_deleted",
    entityType: "subscription",
    entityId: sub.id,
    changes: { plan: "free", paymentStatus: "canceled" },
    metadata: { actor: "system", stripeEventId: event.id },
  });
}

// ─── invoice.payment_failed / invoice.payment_succeeded ─────────────
//
// Per Q6 lock: payment_failed does NOT change the plan (stay-on-plan
// during Stripe Smart Retries). payment_succeeded clears past_due back
// to active. Plan changes are driven exclusively by the subscription
// events above.

async function applyPaymentStatus(
  organizationId: string,
  paymentStatus: "active" | "past_due",
  actorUserId: string,
  event: Stripe.Event,
): Promise<void> {
  await withTenant(organizationId, async (tx) => {
    await tx.organization.update({
      where: { id: organizationId },
      data: { paymentStatus },
    });
  });

  await audit({
    userId: actorUserId,
    organizationId,
    action: paymentStatus === "active" ? "payment_succeeded" : "payment_failed",
    entityType: "subscription",
    changes: { paymentStatus, stripeEventId: event.id },
    metadata: { actor: "system" },
  });
}
