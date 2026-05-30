/**
 * Phase 13 smoke-test webhook simulator.
 *
 * Crafts Stripe.Event payloads, HMAC-signs them with the dev webhook
 * secret (from .env.local), and POSTs to /api/webhooks/stripe so we
 * can exercise the dispatch path without driving a real Stripe
 * Checkout. Used by the smoke runner to test:
 *
 *   - dedupe / replay (same event id sent twice)
 *   - unknown priceId (markStripeEventError branch)
 *   - no-customer payload (resolved:false branch)
 *   - org-not-found (resolved:false branch)
 *   - invoice.payment_failed -> past-due banner
 *   - invoice.payment_succeeded -> active
 *   - customer.subscription.deleted -> downgrade
 *   - charge.refunded -> payment_refunded audit row
 *
 * Reads STRIPE_WEBHOOK_SECRET from .env.local first, then falls back
 * to .env (matches Next.js's precedence).
 */

import { createHmac } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

const ARG_CMD = process.argv[2];
const ARG_REST = process.argv.slice(3);

function loadEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const path of [".env", ".env.local"]) {
    if (!existsSync(path)) continue;
    const raw = readFileSync(path, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      let val = m[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      out[m[1]] = val;
    }
  }
  return out;
}

const env = loadEnv();
const SECRET = env.STRIPE_WEBHOOK_SECRET;
const URL = "http://localhost:3000/api/webhooks/stripe";
if (!SECRET) {
  console.error("Missing STRIPE_WEBHOOK_SECRET in .env / .env.local");
  process.exit(1);
}

function signPayload(payload: string, ts: number): string {
  const signed = `${ts}.${payload}`;
  const sig = createHmac("sha256", SECRET).update(signed).digest("hex");
  return `t=${ts},v1=${sig}`;
}

async function sendEvent(event: Record<string, unknown>): Promise<{
  status: number;
  body: unknown;
}> {
  const payload = JSON.stringify(event);
  const ts = Math.floor(Date.now() / 1000);
  const signature = signPayload(payload, ts);
  const res = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Stripe-Signature": signature,
    },
    body: payload,
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status, body };
}

function makeEvent(opts: {
  id?: string;
  type: string;
  object: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    id: opts.id ?? `evt_smoke_${Date.now().toString(36)}`,
    object: "event",
    api_version: "2026-04-22.dahlia",
    created: Math.floor(Date.now() / 1000),
    type: opts.type,
    data: { object: opts.object },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  };
}

// ─── Pre-built event helpers ────────────────────────────────────────

function subscriptionEvent(opts: {
  type:
    | "customer.subscription.created"
    | "customer.subscription.updated"
    | "customer.subscription.deleted";
  customerId: string;
  priceId: string;
  status?: string;
  id?: string;
  subId?: string;
  periodEnd?: number;
}) {
  return makeEvent({
    id: opts.id,
    type: opts.type,
    object: {
      id: opts.subId ?? `sub_smoke_${Date.now().toString(36)}`,
      object: "subscription",
      customer: opts.customerId,
      status: opts.status ?? "active",
      items: {
        data: [
          {
            id: `si_smoke_${Date.now().toString(36)}`,
            price: {
              id: opts.priceId,
              object: "price",
            },
            current_period_end:
              opts.periodEnd ?? Math.floor(Date.now() / 1000) + 30 * 86400,
          },
        ],
      },
    },
  });
}

function invoiceEvent(opts: {
  type: "invoice.payment_failed" | "invoice.payment_succeeded";
  customerId: string;
  id?: string;
}) {
  return makeEvent({
    id: opts.id,
    type: opts.type,
    object: {
      id: `in_smoke_${Date.now().toString(36)}`,
      object: "invoice",
      customer: opts.customerId,
      amount_paid: 900,
      currency: "usd",
    },
  });
}

function chargeRefundedEvent(opts: { customerId: string; id?: string }) {
  return makeEvent({
    id: opts.id,
    type: "charge.refunded",
    object: {
      id: `ch_smoke_${Date.now().toString(36)}`,
      object: "charge",
      customer: opts.customerId,
      amount_refunded: 900,
      currency: "usd",
    },
  });
}

// ─── CLI router ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (ARG_CMD === "subscription-created") {
    const [customerId, priceId] = ARG_REST;
    const r = await sendEvent(
      subscriptionEvent({
        type: "customer.subscription.created",
        customerId,
        priceId,
      }),
    );
    console.log(JSON.stringify(r));
    return;
  }
  if (ARG_CMD === "subscription-updated") {
    const [customerId, priceId, status, subId] = ARG_REST;
    const r = await sendEvent(
      subscriptionEvent({
        type: "customer.subscription.updated",
        customerId,
        priceId,
        status,
        subId,
      }),
    );
    console.log(JSON.stringify(r));
    return;
  }
  if (ARG_CMD === "subscription-deleted") {
    const [customerId, priceId, subId] = ARG_REST;
    const r = await sendEvent(
      subscriptionEvent({
        type: "customer.subscription.deleted",
        customerId,
        priceId,
        subId,
      }),
    );
    console.log(JSON.stringify(r));
    return;
  }
  if (ARG_CMD === "payment-failed") {
    const [customerId] = ARG_REST;
    const r = await sendEvent(
      invoiceEvent({ type: "invoice.payment_failed", customerId }),
    );
    console.log(JSON.stringify(r));
    return;
  }
  if (ARG_CMD === "payment-succeeded") {
    const [customerId] = ARG_REST;
    const r = await sendEvent(
      invoiceEvent({ type: "invoice.payment_succeeded", customerId }),
    );
    console.log(JSON.stringify(r));
    return;
  }
  if (ARG_CMD === "refund") {
    const [customerId] = ARG_REST;
    const r = await sendEvent(chargeRefundedEvent({ customerId }));
    console.log(JSON.stringify(r));
    return;
  }
  if (ARG_CMD === "replay") {
    // Send the same event twice with a fixed id.
    const [customerId, priceId] = ARG_REST;
    const id = `evt_replay_${Date.now().toString(36)}`;
    const r1 = await sendEvent(
      subscriptionEvent({
        type: "customer.subscription.created",
        customerId,
        priceId,
        id,
      }),
    );
    const r2 = await sendEvent(
      subscriptionEvent({
        type: "customer.subscription.created",
        customerId,
        priceId,
        id,
      }),
    );
    console.log(JSON.stringify({ first: r1, second: r2 }));
    return;
  }
  if (ARG_CMD === "tampered") {
    const payload = JSON.stringify(
      subscriptionEvent({
        type: "customer.subscription.created",
        customerId: "cus_tampered",
        priceId: "price_pro",
      }),
    );
    const ts = Math.floor(Date.now() / 1000);
    const badSig = `t=${ts},v1=00000000`;
    const res = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Stripe-Signature": badSig,
      },
      body: payload,
    });
    console.log(JSON.stringify({ status: res.status, body: await res.json() }));
    return;
  }
  if (ARG_CMD === "no-signature") {
    const payload = JSON.stringify({ type: "noop" });
    const res = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
    });
    console.log(JSON.stringify({ status: res.status, body: await res.json() }));
    return;
  }

  console.error(
    "Usage: bun scripts/smoke-webhook.ts <cmd> <args>\n" +
      "Cmds: subscription-created, subscription-updated, subscription-deleted, payment-failed, payment-succeeded, refund, replay, tampered, no-signature",
  );
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
