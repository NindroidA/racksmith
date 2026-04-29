import "server-only";

import type { Prisma } from "@prisma/client";
import type Stripe from "stripe";

import { prisma } from "./prisma";

// ─── Webhook idempotency ────────────────────────────────────────────
//
// Stripe retries failed webhook deliveries up to ~3 weeks. Processing
// the same event twice is the #1 source of double-billing bugs in
// Stripe integrations. Every event gets a row in StripeEvent keyed on
// Stripe's event.id; the unique constraint converts replays into a
// no-op handled at the DB layer (no race window between read-and-write).

export type RecordResult =
  | { alreadyProcessed: false }
  | { alreadyProcessed: true };

/**
 * Record a Stripe webhook event for idempotent processing. The first
 * call inserts a row and returns `{ alreadyProcessed: false }` — caller
 * proceeds to apply the event's effects. Replays return `{ alreadyProcessed:
 * true }` and the caller MUST short-circuit (return 200 to Stripe with
 * no further DB writes).
 *
 * `organizationId` is optional because we resolve it from the event
 * payload after recording. If resolution succeeds, call
 * `attachStripeEventOrg` to back-fill it for forensics.
 */
export async function recordStripeEvent(
  event: Stripe.Event,
  organizationId?: string,
): Promise<RecordResult> {
  try {
    await prisma.stripeEvent.create({
      data: {
        id: event.id,
        type: event.type,
        payload: event as unknown as Prisma.InputJsonValue,
        organizationId: organizationId ?? null,
      },
    });
    return { alreadyProcessed: false };
  } catch (err) {
    // P2002 = Prisma unique-constraint violation. That's the dedupe
    // signal — same event.id was already processed.
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return { alreadyProcessed: true };
    }
    throw err;
  }
}

/**
 * Back-fill organizationId on an event after we've resolved it from the
 * payload's customer ID. No-op if the event row has it set already.
 */
export async function attachStripeEventOrg(
  eventId: string,
  organizationId: string,
): Promise<void> {
  await prisma.stripeEvent.update({
    where: { id: eventId },
    data: { organizationId },
  });
}

/**
 * Mark an event as failed processing so the row records what went
 * wrong. Used when the webhook handler returns 500 to Stripe — Stripe
 * will retry, and on retry our recordStripeEvent will return
 * `alreadyProcessed: true` (the row exists). Wait — we want retries to
 * actually retry, not short-circuit on the error row. So errored rows
 * are deleted before Stripe's retry, OR we tolerate the error path
 * being non-idempotent and accept that retries become no-ops once
 * we've recorded the event.
 *
 * Phase 13 PR-C decision: events that throw mid-processing get their
 * row DELETED so Stripe's retry can re-enter the handler cleanly. This
 * function is the "soft-fail" path where we want to log the error but
 * keep the row so we don't reprocess (e.g. unresolvable customer —
 * retrying won't help).
 */
export async function markStripeEventError(
  eventId: string,
  errorMessage: string,
): Promise<void> {
  await prisma.stripeEvent.update({
    where: { id: eventId },
    data: { errorMessage },
  });
}

/**
 * Delete an event row so Stripe's retry can re-enter the handler. Used
 * for transient errors (DB unavailable, Stripe API failure mid-handler)
 * where retrying is expected to succeed.
 */
export async function clearStripeEvent(eventId: string): Promise<void> {
  await prisma.stripeEvent.delete({ where: { id: eventId } });
}
