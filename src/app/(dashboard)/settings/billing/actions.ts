"use server";

import { z } from "zod";

import { audit } from "@/lib/audit";
import { handleZodError, withActionEnvelope } from "@/lib/action-helpers";
import { requireMember } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isKnownPriceId, lookupPriceId, stripe } from "@/lib/stripe";
import type { ActionResult } from "@/lib/action-types";

// ─── Input schema ───────────────────────────────────────────────────
//
// `priceId` is validated against the price registry rather than as an
// opaque string — accepting unknown price IDs would let the caller
// choose any Stripe Price, including ones from another product. Pinning
// to the four IDs we configured is the simplest defense.

const checkoutSchema = z.object({
  priceId: z.string().refine(isKnownPriceId, "Unknown priceId"),
});

/**
 * Create a Stripe Checkout session and return its hosted-checkout URL.
 * Caller redirects the browser to that URL; Stripe handles the rest of
 * the payment flow. The plan flip itself happens via webhook (PR-C) —
 * this action only opens the checkout door.
 *
 * Auth: admin or owner (matches API-keys / org-management policy).
 * Pre-flight: email verified (Q3 lock — disposable-email + stolen-card
 * fraud path).
 *
 * Idempotency: the Stripe customer is created lazily on first checkout
 * and stamped onto Organization.stripeCustomerId. Subsequent checkouts
 * reuse it. Concurrent first-checkout calls serialize via a conditional
 * `updateMany` keyed on `stripeCustomerId: null` — the winner sets it
 * to its newly-created customer ID, every other concurrent call gets
 * count=0, deletes its orphan Stripe customer, and re-reads the
 * persisted winner. Plain `update` would NOT trigger P2002 here (both
 * updates target the same primary key — the unique constraint on
 * stripeCustomerId would only fire across different rows), so the
 * conditional write is the correct race-detector.
 */
export async function createCheckoutSession(
  input: z.infer<typeof checkoutSchema>,
): Promise<ActionResult<{ url: string }>> {
  return withActionEnvelope(async () => {
    const parsed = checkoutSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: handleZodError(parsed.error) };
    }

    const { session, organizationId } = await requireMember("admin");

    if (!session.user.emailVerified) {
      return {
        ok: false,
        error: "Please verify your email before upgrading.",
      };
    }

    const tierLookup = lookupPriceId(parsed.data.priceId);
    if (!tierLookup) {
      // Unreachable given the Zod refine, but the type system doesn't
      // know that — return a clear error rather than non-null assert.
      return { ok: false, error: "Unknown priceId" };
    }
    const { tier } = tierLookup;

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        stripeCustomerId: true,
        members: { select: { id: true } },
      },
    });
    if (!org) {
      return { ok: false, error: "Organization not found" };
    }

    // Lazy customer creation. Persist before opening Checkout so a
    // concurrent caller doesn't create a duplicate Stripe customer.
    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: session.user.email,
        name: org.name,
        metadata: { organizationId },
      });
      const persisted = await prisma.organization.updateMany({
        where: { id: organizationId, stripeCustomerId: null },
        data: { stripeCustomerId: customer.id },
      });
      if (persisted.count === 1) {
        customerId = customer.id;
      } else {
        // Lost the race — another concurrent caller already persisted
        // a customer. Clean up our orphan and re-read the winner.
        await stripe.customers.del(customer.id).catch(() => undefined);
        const reread = await prisma.organization.findUnique({
          where: { id: organizationId },
          select: { stripeCustomerId: true },
        });
        if (!reread?.stripeCustomerId) {
          return {
            ok: false,
            error: "Failed to provision billing customer. Please retry.",
          };
        }
        customerId = reread.stripeCustomerId;
      }
    }

    // Business: bill per seat — quantity = current member count read at
    // checkout time. PR-D adds real-time reconciliation on member
    // create/delete so the subscription quantity stays in sync.
    const quantity = tier === "business" ? org.members.length : 1;

    // Trusted base URL for Checkout return URLs. Reading this from the
    // request `Origin` header would let a client-spoofed value flow into
    // Stripe's success_url / cancel_url — open-redirect / phishing
    // surface. BETTER_AUTH_URL is the canonical server-side origin.
    const baseUrl = process.env.BETTER_AUTH_URL;
    if (!baseUrl) {
      return {
        ok: false,
        error: "Server is missing BETTER_AUTH_URL configuration.",
      };
    }
    const origin = baseUrl.replace(/\/+$/, "");

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: parsed.data.priceId, quantity }],
      success_url: `${origin}/settings/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/settings/billing?status=cancelled`,
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      customer_update: { address: "auto", name: "auto" },
      allow_promotion_codes: true,
      client_reference_id: organizationId,
      metadata: { organizationId, tier },
    });

    if (!checkoutSession.url) {
      return {
        ok: false,
        error: "Stripe did not return a checkout URL",
      };
    }

    await audit({
      userId: session.user.id,
      organizationId,
      action: "subscription_updated",
      entityType: "subscription",
      changes: {
        intent: "checkout_started",
        tier,
        priceId: parsed.data.priceId,
        quantity,
      },
    });

    return { ok: true, data: { url: checkoutSession.url } };
  }, "Failed to start checkout");
}
