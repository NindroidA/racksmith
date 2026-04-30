import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockOrgFindUnique = vi.fn();
const mockMemberCount = vi.fn();
const mockQueryRawUnsafe = vi.fn();
const mockSubscriptionItemsUpdate = vi.fn();

vi.mock("./prisma", () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        organization: { findUnique: mockOrgFindUnique },
        member: { count: mockMemberCount },
        $queryRawUnsafe: mockQueryRawUnsafe,
      }),
    ),
  },
}));

vi.mock("./stripe", () => ({
  stripe: {
    subscriptionItems: {
      update: (...args: unknown[]) => mockSubscriptionItemsUpdate(...args),
    },
  },
}));

import { syncSeatsForOrg, syncSeatsForOrgStandalone } from "./stripe-seats";

type MockTx = {
  organization: { findUnique: typeof mockOrgFindUnique };
  member: { count: typeof mockMemberCount };
  $queryRawUnsafe: typeof mockQueryRawUnsafe;
};

function buildTx(): MockTx {
  return {
    organization: { findUnique: mockOrgFindUnique },
    member: { count: mockMemberCount },
    $queryRawUnsafe: mockQueryRawUnsafe,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMemberCount.mockResolvedValue(7);
  mockQueryRawUnsafe.mockResolvedValue(undefined);
  mockSubscriptionItemsUpdate.mockResolvedValue({});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("syncSeatsForOrg", () => {
  it("is a no-op for free orgs", async () => {
    mockOrgFindUnique.mockResolvedValue({
      plan: "free",
      stripeSubscriptionId: null,
      stripeSubscriptionItemId: null,
      paymentStatus: null,
    });
    await syncSeatsForOrg(buildTx() as never, "org_free");
    expect(mockSubscriptionItemsUpdate).not.toHaveBeenCalled();
    expect(mockMemberCount).not.toHaveBeenCalled();
  });

  it("is a no-op for pro orgs", async () => {
    mockOrgFindUnique.mockResolvedValue({
      plan: "pro",
      stripeSubscriptionId: "sub_pro",
      stripeSubscriptionItemId: "si_pro",
      paymentStatus: "active",
    });
    await syncSeatsForOrg(buildTx() as never, "org_pro");
    expect(mockSubscriptionItemsUpdate).not.toHaveBeenCalled();
  });

  it("pushes the new quantity to Stripe for business orgs", async () => {
    mockOrgFindUnique.mockResolvedValue({
      plan: "business",
      stripeSubscriptionId: "sub_biz",
      stripeSubscriptionItemId: "si_biz",
      paymentStatus: "active",
    });
    mockMemberCount.mockResolvedValue(12);

    await syncSeatsForOrg(buildTx() as never, "org_biz");

    expect(mockSubscriptionItemsUpdate).toHaveBeenCalledWith("si_biz", {
      quantity: 12,
      proration_behavior: "create_prorations",
    });
  });

  it("acquires a per-org advisory lock before re-counting", async () => {
    mockOrgFindUnique.mockResolvedValue({
      plan: "business",
      stripeSubscriptionId: "sub_biz",
      stripeSubscriptionItemId: "si_biz",
      paymentStatus: "active",
    });

    await syncSeatsForOrg(buildTx() as never, "org_biz");

    expect(mockQueryRawUnsafe).toHaveBeenCalledWith(
      expect.stringContaining("pg_advisory_xact_lock"),
      expect.any(Number),
      "org_biz",
    );
    // Lock comes before the count + the Stripe call (caller relies on
    // serialization to avoid stale-quantity races).
    const lockOrder = mockQueryRawUnsafe.mock.invocationCallOrder[0];
    const countOrder = mockMemberCount.mock.invocationCallOrder[0];
    const stripeOrder =
      mockSubscriptionItemsUpdate.mock.invocationCallOrder[0];
    expect(lockOrder).toBeLessThan(countOrder);
    expect(countOrder).toBeLessThan(stripeOrder);
  });

  it("skips when the org is missing subscription linkage", async () => {
    mockOrgFindUnique.mockResolvedValue({
      plan: "business",
      stripeSubscriptionId: null,
      stripeSubscriptionItemId: null,
      paymentStatus: "active",
    });
    await syncSeatsForOrg(buildTx() as never, "org_misconfigured");
    expect(mockSubscriptionItemsUpdate).not.toHaveBeenCalled();
  });

  it("skips when the subscription is canceled", async () => {
    mockOrgFindUnique.mockResolvedValue({
      plan: "business",
      stripeSubscriptionId: "sub_biz",
      stripeSubscriptionItemId: "si_biz",
      paymentStatus: "canceled",
    });
    await syncSeatsForOrg(buildTx() as never, "org_canceled");
    expect(mockSubscriptionItemsUpdate).not.toHaveBeenCalled();
  });

  it("propagates Stripe errors so the caller's tx rolls back", async () => {
    mockOrgFindUnique.mockResolvedValue({
      plan: "business",
      stripeSubscriptionId: "sub_biz",
      stripeSubscriptionItemId: "si_biz",
      paymentStatus: "active",
    });
    mockSubscriptionItemsUpdate.mockRejectedValue(new Error("Stripe down"));

    await expect(
      syncSeatsForOrg(buildTx() as never, "org_biz"),
    ).rejects.toThrow("Stripe down");
  });
});

describe("syncSeatsForOrgStandalone", () => {
  it("opens its own transaction and calls syncSeatsForOrg", async () => {
    mockOrgFindUnique.mockResolvedValue({
      plan: "business",
      stripeSubscriptionId: "sub_biz",
      stripeSubscriptionItemId: "si_biz",
      paymentStatus: "active",
    });
    mockMemberCount.mockResolvedValue(3);

    await syncSeatsForOrgStandalone("org_biz");

    expect(mockSubscriptionItemsUpdate).toHaveBeenCalledWith("si_biz", {
      quantity: 3,
      proration_behavior: "create_prorations",
    });
  });
});
