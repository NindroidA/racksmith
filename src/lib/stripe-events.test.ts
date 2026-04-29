import { beforeEach, describe, expect, it, vi } from "vitest";

import type Stripe from "stripe";

vi.mock("./prisma", () => ({
  prisma: {
    stripeEvent: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { prisma } from "./prisma";
import {
  attachStripeEventOrg,
  clearStripeEvent,
  markStripeEventError,
  recordStripeEvent,
} from "./stripe-events";

function fakeEvent(id = "evt_test_001"): Stripe.Event {
  return {
    id,
    object: "event",
    api_version: "2026-04-22.dahlia",
    created: 1700000000,
    data: { object: { id: "cus_abc" } },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
    type: "customer.subscription.created",
  } as unknown as Stripe.Event;
}

describe("recordStripeEvent", () => {
  beforeEach(() => {
    vi.mocked(prisma.stripeEvent.create).mockReset();
    vi.mocked(prisma.stripeEvent.update).mockReset();
    vi.mocked(prisma.stripeEvent.delete).mockReset();
  });

  it("inserts a new row and returns alreadyProcessed:false on first call", async () => {
    vi.mocked(prisma.stripeEvent.create).mockResolvedValue({} as never);
    const result = await recordStripeEvent(fakeEvent("evt_1"), "org_1");
    expect(result).toEqual({ alreadyProcessed: false });
    expect(prisma.stripeEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "evt_1",
        type: "customer.subscription.created",
        organizationId: "org_1",
      }),
    });
  });

  it("returns alreadyProcessed:true when the unique constraint trips (P2002)", async () => {
    vi.mocked(prisma.stripeEvent.create).mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );
    const result = await recordStripeEvent(fakeEvent("evt_dup"));
    expect(result).toEqual({ alreadyProcessed: true });
  });

  it("rethrows non-P2002 errors so the caller can fail-loud", async () => {
    vi.mocked(prisma.stripeEvent.create).mockRejectedValue(
      new Error("connection refused"),
    );
    await expect(recordStripeEvent(fakeEvent("evt_err"))).rejects.toThrow(
      "connection refused",
    );
  });

  it("accepts a missing organizationId (resolved post-record)", async () => {
    vi.mocked(prisma.stripeEvent.create).mockResolvedValue({} as never);
    await recordStripeEvent(fakeEvent("evt_no_org"));
    expect(prisma.stripeEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ organizationId: null }),
    });
  });
});

describe("attachStripeEventOrg", () => {
  beforeEach(() => {
    vi.mocked(prisma.stripeEvent.update).mockReset();
  });

  it("back-fills organizationId on the recorded row", async () => {
    vi.mocked(prisma.stripeEvent.update).mockResolvedValue({} as never);
    await attachStripeEventOrg("evt_1", "org_1");
    expect(prisma.stripeEvent.update).toHaveBeenCalledWith({
      where: { id: "evt_1" },
      data: { organizationId: "org_1" },
    });
  });
});

describe("markStripeEventError", () => {
  beforeEach(() => {
    vi.mocked(prisma.stripeEvent.update).mockReset();
  });

  it("records the errorMessage so soft-failed events stay processed", async () => {
    vi.mocked(prisma.stripeEvent.update).mockResolvedValue({} as never);
    await markStripeEventError("evt_1", "customer not found");
    expect(prisma.stripeEvent.update).toHaveBeenCalledWith({
      where: { id: "evt_1" },
      data: { errorMessage: "customer not found" },
    });
  });
});

describe("clearStripeEvent", () => {
  beforeEach(() => {
    vi.mocked(prisma.stripeEvent.delete).mockReset();
  });

  it("deletes the row so Stripe's retry can re-enter the handler", async () => {
    vi.mocked(prisma.stripeEvent.delete).mockResolvedValue({} as never);
    await clearStripeEvent("evt_1");
    expect(prisma.stripeEvent.delete).toHaveBeenCalledWith({
      where: { id: "evt_1" },
    });
  });
});
