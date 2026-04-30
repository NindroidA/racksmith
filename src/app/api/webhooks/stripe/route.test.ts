import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Hoisted mocks ──────────────────────────────────────────────────

const mockConstructEvent = vi.fn();
vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: {
      constructEvent: (...args: unknown[]) => mockConstructEvent(...args),
    },
  },
  getStripeWebhookSecret: () => "whsec_test",
  lookupPriceId: (id: string) => {
    if (id === "price_pro_m") return { tier: "pro", cycle: "monthly" };
    if (id === "price_biz_a") return { tier: "business", cycle: "annual" };
    return null;
  },
}));

const mockOrgFindUnique = vi.fn();
const mockMemberFindFirst = vi.fn();
const mockOrgUpdate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findUnique: (...a: unknown[]) => mockOrgFindUnique(...a) },
    member: { findFirst: (...a: unknown[]) => mockMemberFindFirst(...a) },
  },
}));

vi.mock("@/lib/prisma-tenant", () => ({
  withTenant: vi.fn(
    async (
      _orgId: string,
      fn: (tx: {
        organization: { update: typeof mockOrgUpdate };
      }) => Promise<unknown>,
    ) => fn({ organization: { update: mockOrgUpdate } }),
  ),
}));

const mockRecord = vi.fn();
const mockAttachOrg = vi.fn();
const mockMarkErr = vi.fn();
const mockClear = vi.fn();
vi.mock("@/lib/stripe-events", () => ({
  recordStripeEvent: (...a: unknown[]) => mockRecord(...a),
  attachStripeEventOrg: (...a: unknown[]) => mockAttachOrg(...a),
  markStripeEventError: (...a: unknown[]) => mockMarkErr(...a),
  clearStripeEvent: (...a: unknown[]) => mockClear(...a),
}));

const mockAudit = vi.fn();
vi.mock("@/lib/audit", () => ({
  audit: (...a: unknown[]) => mockAudit(...a),
}));

import { POST } from "./route";

// ─── Helpers ────────────────────────────────────────────────────────

function buildReq(
  body: string,
  signature: string | null = "valid-sig",
): Request {
  const headers = new Headers();
  if (signature) headers.set("stripe-signature", signature);
  return new Request("https://test.example/api/webhooks/stripe", {
    method: "POST",
    body,
    headers,
  });
}

function subEvent(
  type:
    | "customer.subscription.created"
    | "customer.subscription.updated"
    | "customer.subscription.deleted",
  overrides: {
    priceId?: string;
    status?: string;
    periodEnd?: number;
    customerId?: string;
  } = {},
) {
  return {
    id: `evt_${type}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    data: {
      object: {
        id: "sub_test",
        status: overrides.status ?? "active",
        customer: overrides.customerId ?? "cus_test",
        items: {
          data: [
            {
              id: "si_test",
              price: { id: overrides.priceId ?? "price_pro_m" },
              current_period_end: overrides.periodEnd ?? 1900000000,
            },
          ],
        },
      },
    },
  } as unknown;
}

function invoiceEvent(
  type: "invoice.payment_failed" | "invoice.payment_succeeded",
  customerId = "cus_test",
) {
  return {
    id: `evt_${type}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    data: { object: { id: "in_test", customer: customerId } },
  } as unknown;
}

function chargeRefundEvent(customerId = "cus_test") {
  return {
    id: `evt_charge_${Math.random().toString(36).slice(2, 8)}`,
    type: "charge.refunded",
    data: {
      object: {
        id: "ch_test",
        customer: customerId,
        amount_refunded: 900,
        currency: "usd",
      },
    },
  } as unknown;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default happy-path resolutions
  mockOrgFindUnique.mockResolvedValue({ id: "org_1" });
  mockMemberFindFirst.mockResolvedValue({ userId: "user_owner" });
  mockRecord.mockResolvedValue({ alreadyProcessed: false });
  mockAttachOrg.mockResolvedValue(undefined);
  mockOrgUpdate.mockResolvedValue({});
  mockAudit.mockResolvedValue(undefined);
  mockMarkErr.mockResolvedValue(undefined);
  mockClear.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ─── Tests ──────────────────────────────────────────────────────────

describe("POST /api/webhooks/stripe — signature verification", () => {
  it("returns 400 when stripe-signature header is missing", async () => {
    const res = await POST(buildReq("body", null));
    expect(res.status).toBe(400);
    expect(mockConstructEvent).not.toHaveBeenCalled();
  });

  it("returns 400 when constructEvent throws (tampered body or bad signature)", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Bad signature");
    });
    const res = await POST(buildReq("tampered"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Signature verification failed/i);
    expect(mockOrgFindUnique).not.toHaveBeenCalled();
  });
});

describe("POST /api/webhooks/stripe — idempotency", () => {
  it("returns 200 with replay:true on duplicate event.id", async () => {
    mockConstructEvent.mockReturnValue(
      subEvent("customer.subscription.created"),
    );
    mockRecord.mockResolvedValue({ alreadyProcessed: true });

    const res = await POST(buildReq("{}"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ received: true, replay: true });
    // No DB writes on replay
    expect(mockOrgUpdate).not.toHaveBeenCalled();
    expect(mockAudit).not.toHaveBeenCalled();
  });
});

describe("POST /api/webhooks/stripe — customer resolution", () => {
  it("returns 200 + marks error when no Organization matches the customer ID", async () => {
    mockConstructEvent.mockReturnValue(
      subEvent("customer.subscription.created"),
    );
    mockOrgFindUnique.mockResolvedValue(null);

    const res = await POST(buildReq("{}"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ received: true, resolved: false });
    expect(mockMarkErr).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("No organization for customer"),
    );
    expect(mockOrgUpdate).not.toHaveBeenCalled();
  });

  it("returns 200 when payload has no customer ID (audit-only)", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_no_cus",
      type: "customer.subscription.created",
      data: { object: { customer: null } },
    });
    const res = await POST(buildReq("{}"));
    expect(res.status).toBe(200);
    expect(mockMarkErr).toHaveBeenCalledWith(
      "evt_no_cus",
      expect.stringContaining("No customer ID"),
    );
  });
});

describe("POST /api/webhooks/stripe — subscription.created", () => {
  it("flips plan to pro + sets paymentStatus active", async () => {
    mockConstructEvent.mockReturnValue(
      subEvent("customer.subscription.created", { priceId: "price_pro_m" }),
    );
    const res = await POST(buildReq("{}"));
    expect(res.status).toBe(200);
    expect(mockOrgUpdate).toHaveBeenCalledWith({
      where: { id: "org_1" },
      data: expect.objectContaining({
        plan: "pro",
        paymentStatus: "active",
        stripeSubscriptionId: "sub_test",
      }),
    });
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_owner",
        action: "subscription_created",
        metadata: expect.objectContaining({ actor: "system" }),
      }),
    );
  });

  it("flips plan to business for business priceId", async () => {
    mockConstructEvent.mockReturnValue(
      subEvent("customer.subscription.created", { priceId: "price_biz_a" }),
    );
    await POST(buildReq("{}"));
    expect(mockOrgUpdate).toHaveBeenCalledWith({
      where: { id: "org_1" },
      data: expect.objectContaining({ plan: "business" }),
    });
  });

  it("does NOT touch the plan for an unknown priceId", async () => {
    mockConstructEvent.mockReturnValue(
      subEvent("customer.subscription.created", { priceId: "price_unknown" }),
    );
    await POST(buildReq("{}"));
    expect(mockOrgUpdate).not.toHaveBeenCalled();
    expect(mockMarkErr).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("Unknown priceId"),
    );
  });
});

describe("POST /api/webhooks/stripe — subscription.updated", () => {
  it("uses subscription_updated audit verb (not _created)", async () => {
    mockConstructEvent.mockReturnValue(
      subEvent("customer.subscription.updated", { priceId: "price_biz_a" }),
    );
    await POST(buildReq("{}"));
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "subscription_updated" }),
    );
  });

  it("collapses Stripe past_due status to paymentStatus past_due", async () => {
    mockConstructEvent.mockReturnValue(
      subEvent("customer.subscription.updated", {
        priceId: "price_pro_m",
        status: "past_due",
      }),
    );
    await POST(buildReq("{}"));
    expect(mockOrgUpdate).toHaveBeenCalledWith({
      where: { id: "org_1" },
      data: expect.objectContaining({ paymentStatus: "past_due" }),
    });
  });
});

describe("POST /api/webhooks/stripe — subscription.deleted", () => {
  it("hard-downgrades to free + clears Stripe sub linkage", async () => {
    mockConstructEvent.mockReturnValue(
      subEvent("customer.subscription.deleted", { priceId: "price_pro_m" }),
    );
    await POST(buildReq("{}"));
    expect(mockOrgUpdate).toHaveBeenCalledWith({
      where: { id: "org_1" },
      data: {
        plan: "free",
        paymentStatus: "canceled",
        planExpiresAt: expect.any(Date),
        stripeSubscriptionId: null,
        stripeSubscriptionItemId: null,
        stripePriceId: null,
      },
    });
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "subscription_deleted" }),
    );
  });
});

describe("POST /api/webhooks/stripe — invoice events", () => {
  it("invoice.payment_failed sets paymentStatus past_due but does NOT change plan", async () => {
    mockConstructEvent.mockReturnValue(invoiceEvent("invoice.payment_failed"));
    await POST(buildReq("{}"));
    const call = mockOrgUpdate.mock.calls[0]?.[0];
    expect(call.data).toEqual({ paymentStatus: "past_due" });
    expect(call.data).not.toHaveProperty("plan"); // Q6 lock
  });

  it("invoice.payment_succeeded sets paymentStatus active", async () => {
    mockConstructEvent.mockReturnValue(
      invoiceEvent("invoice.payment_succeeded"),
    );
    await POST(buildReq("{}"));
    expect(mockOrgUpdate).toHaveBeenCalledWith({
      where: { id: "org_1" },
      data: { paymentStatus: "active" },
    });
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "payment_succeeded" }),
    );
  });
});

describe("POST /api/webhooks/stripe — charge.refunded (audit-only)", () => {
  it("records audit but does NOT touch the plan or subscription", async () => {
    mockConstructEvent.mockReturnValue(chargeRefundEvent());
    await POST(buildReq("{}"));
    expect(mockOrgUpdate).not.toHaveBeenCalled();
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "payment_refunded",
        changes: expect.objectContaining({
          amount: 900,
          currency: "usd",
          stripeChargeId: "ch_test",
        }),
      }),
    );
  });
});

describe("POST /api/webhooks/stripe — error handling", () => {
  it("clears the StripeEvent row + returns 500 on dispatch failure (so Stripe retries)", async () => {
    mockConstructEvent.mockReturnValue(
      subEvent("customer.subscription.created"),
    );
    mockOrgUpdate.mockRejectedValue(new Error("DB unavailable"));
    const res = await POST(buildReq("{}"));
    expect(res.status).toBe(500);
    expect(mockClear).toHaveBeenCalledWith(expect.any(String));
  });

  it("returns 200 + audited:false when org has zero members (skips dispatch)", async () => {
    mockConstructEvent.mockReturnValue(
      subEvent("customer.subscription.created"),
    );
    // Both the owner lookup and the fallback-member lookup return null.
    mockMemberFindFirst.mockResolvedValue(null);
    const res = await POST(buildReq("{}"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ received: true, audited: false });
    expect(mockOrgUpdate).not.toHaveBeenCalled();
  });

  it("falls back to a non-owner member for audit when org has no owner", async () => {
    mockConstructEvent.mockReturnValue(
      subEvent("customer.subscription.created"),
    );
    // First call (role: owner) → null. Second call (any member) → fallback.
    mockMemberFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ userId: "user_member" });
    const res = await POST(buildReq("{}"));
    expect(res.status).toBe(200);
    expect(mockOrgUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "org_1" } }),
    );
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user_member",
        action: "subscription_created",
        metadata: expect.objectContaining({ actor: "system" }),
      }),
    );
  });
});

describe("POST /api/webhooks/stripe — unhandled event types", () => {
  it("marks error + returns 200 for events outside the 6-event scope", async () => {
    mockConstructEvent.mockReturnValue({
      id: "evt_unhandled",
      type: "customer.created",
      data: { object: { customer: "cus_test" } },
    });
    const res = await POST(buildReq("{}"));
    expect(res.status).toBe(200);
    expect(mockMarkErr).toHaveBeenCalledWith(
      "evt_unhandled",
      expect.stringContaining("Unhandled event type"),
    );
    expect(mockOrgUpdate).not.toHaveBeenCalled();
  });
});
