import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError } from "@/lib/auth-helpers";

// ─── Hoisted mocks ──────────────────────────────────────────────────

const mockRequireMember = vi.fn();
vi.mock("@/lib/auth-helpers", async () => {
  // Use the real ForbiddenError class so `err instanceof ForbiddenError`
  // checks inside withActionEnvelope work correctly. Only requireMember
  // is replaced.
  const actual =
    await vi.importActual<typeof import("@/lib/auth-helpers")>(
      "@/lib/auth-helpers",
    );
  return {
    ...actual,
    requireMember: (...args: unknown[]) => mockRequireMember(...args),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  audit: vi.fn(async () => undefined),
}));

const mockCustomersCreate = vi.fn();
const mockCustomersDel = vi.fn();
const mockCheckoutCreate = vi.fn();
const mockPortalCreate = vi.fn();

const KNOWN_IDS = new Set([
  "price_pro_m_test",
  "price_pro_a_test",
  "price_biz_m_test",
  "price_biz_a_test",
]);

vi.mock("@/lib/stripe", () => ({
  stripe: {
    customers: {
      create: (...args: unknown[]) => mockCustomersCreate(...args),
      del: (...args: unknown[]) => mockCustomersDel(...args),
    },
    checkout: {
      sessions: {
        create: (...args: unknown[]) => mockCheckoutCreate(...args),
      },
    },
    billingPortal: {
      sessions: {
        create: (...args: unknown[]) => mockPortalCreate(...args),
      },
    },
  },
  STRIPE_PRICE_IDS: {
    pro_monthly: "price_pro_m_test",
    pro_annual: "price_pro_a_test",
    business_monthly: "price_biz_m_test",
    business_annual: "price_biz_a_test",
  },
  isKnownPriceId: (id: string) => KNOWN_IDS.has(id),
  lookupPriceId: (id: string) => {
    if (id === "price_pro_m_test") return { tier: "pro", cycle: "monthly" };
    if (id === "price_pro_a_test") return { tier: "pro", cycle: "annual" };
    if (id === "price_biz_m_test")
      return { tier: "business", cycle: "monthly" };
    if (id === "price_biz_a_test") return { tier: "business", cycle: "annual" };
    return null;
  },
}));

import { prisma } from "@/lib/prisma";
import { createCheckoutSession, createPortalSession } from "./actions";

// ─── Test fixtures ──────────────────────────────────────────────────

function withMember(
  opts: {
    emailVerified?: boolean;
    role?: "admin" | "owner" | "member";
    userId?: string;
    email?: string;
  } = {},
) {
  mockRequireMember.mockResolvedValue({
    session: {
      user: {
        id: opts.userId ?? "user_1",
        email: opts.email ?? "test@example.com",
        emailVerified: opts.emailVerified ?? true,
      },
    },
    organizationId: "org_1",
    role: opts.role ?? "admin",
  });
}

function withOrg(
  opts: {
    stripeCustomerId?: string | null;
    memberCount?: number;
    name?: string;
  } = {},
) {
  vi.mocked(prisma.organization.findUnique).mockResolvedValue({
    id: "org_1",
    name: opts.name ?? "Test Org",
    stripeCustomerId: opts.stripeCustomerId ?? null,
    members: Array.from({ length: opts.memberCount ?? 1 }, (_, i) => ({
      id: `mem_${i}`,
    })),
  } as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("BETTER_AUTH_URL", "https://test.example");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ─── Tests ──────────────────────────────────────────────────────────

describe("createCheckoutSession — input validation", () => {
  it("rejects an unknown priceId", async () => {
    withMember();
    withOrg();
    const result = await createCheckoutSession({ priceId: "price_unknown" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Unknown priceId/i);
    }
  });
});

describe("createCheckoutSession — auth + email gates", () => {
  it("rejects when email is not verified", async () => {
    withMember({ emailVerified: false });
    withOrg();
    const result = await createCheckoutSession({
      priceId: "price_pro_m_test",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/verify your email/i);
    }
    expect(mockCustomersCreate).not.toHaveBeenCalled();
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
  });

  it("translates a real ForbiddenError into ok:false (member rank)", async () => {
    // Use the actual ForbiddenError class so this test would catch a
    // regression where withActionEnvelope's `instanceof` check changes.
    mockRequireMember.mockRejectedValue(
      new ForbiddenError("member can't bill"),
    );
    const result = await createCheckoutSession({
      priceId: "price_pro_m_test",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/member can't bill/i);
    }
  });
});

describe("createCheckoutSession — config gate", () => {
  it("returns a clear error when BETTER_AUTH_URL is unset", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("BETTER_AUTH_URL", "");
    withMember();
    withOrg({ stripeCustomerId: "cus_x" });
    const result = await createCheckoutSession({
      priceId: "price_pro_m_test",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/BETTER_AUTH_URL/);
    }
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
  });
});

describe("createCheckoutSession — happy path", () => {
  it("creates a Stripe customer lazily and persists it", async () => {
    withMember();
    withOrg({ stripeCustomerId: null, memberCount: 1 });
    mockCustomersCreate.mockResolvedValue({ id: "cus_new" });
    vi.mocked(prisma.organization.updateMany).mockResolvedValue({
      count: 1,
    } as never);
    mockCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/pay/cs_test",
    });

    const result = await createCheckoutSession({
      priceId: "price_pro_m_test",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.url).toMatch(/checkout\.stripe\.com/);
    }
    expect(mockCustomersCreate).toHaveBeenCalledWith({
      email: "test@example.com",
      name: "Test Org",
      metadata: { organizationId: "org_1" },
    });
    expect(prisma.organization.updateMany).toHaveBeenCalledWith({
      where: { id: "org_1", stripeCustomerId: null },
      data: { stripeCustomerId: "cus_new" },
    });
  });

  it("reuses an existing Stripe customer", async () => {
    withMember();
    withOrg({ stripeCustomerId: "cus_existing", memberCount: 1 });
    mockCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/pay/cs_test",
    });

    await createCheckoutSession({ priceId: "price_pro_m_test" });

    expect(mockCustomersCreate).not.toHaveBeenCalled();
    expect(prisma.organization.updateMany).not.toHaveBeenCalled();
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_existing" }),
    );
  });

  it("uses quantity=1 for Pro regardless of member count", async () => {
    withMember();
    withOrg({ stripeCustomerId: "cus_x", memberCount: 7 });
    mockCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/pay/cs_test",
    });

    await createCheckoutSession({ priceId: "price_pro_m_test" });

    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_pro_m_test", quantity: 1 }],
      }),
    );
  });

  it("uses quantity=memberCount for Business", async () => {
    withMember();
    withOrg({ stripeCustomerId: "cus_x", memberCount: 4 });
    mockCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/pay/cs_test",
    });

    await createCheckoutSession({ priceId: "price_biz_m_test" });

    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        line_items: [{ price: "price_biz_m_test", quantity: 4 }],
      }),
    );
  });

  it("passes organizationId as client_reference_id + metadata", async () => {
    withMember();
    withOrg({ stripeCustomerId: "cus_x" });
    mockCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/pay/cs_test",
    });

    await createCheckoutSession({ priceId: "price_pro_a_test" });

    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        client_reference_id: "org_1",
        metadata: { organizationId: "org_1", tier: "pro" },
      }),
    );
  });

  it("enables Stripe Tax + requires billing address (Q2 lock)", async () => {
    withMember();
    withOrg({ stripeCustomerId: "cus_x" });
    mockCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/pay/cs_test",
    });

    await createCheckoutSession({ priceId: "price_pro_m_test" });

    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        automatic_tax: { enabled: true },
        billing_address_collection: "required",
      }),
    );
  });

  it("builds Checkout URLs from BETTER_AUTH_URL, never the request Origin header", async () => {
    withMember();
    withOrg({ stripeCustomerId: "cus_x" });
    mockCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/pay/cs_test",
    });

    await createCheckoutSession({ priceId: "price_pro_m_test" });

    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: expect.stringContaining("https://test.example/"),
        cancel_url: expect.stringContaining("https://test.example/"),
      }),
    );
  });

  it("strips trailing slashes from BETTER_AUTH_URL when building return URLs", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("BETTER_AUTH_URL", "https://racksmith.example/");
    withMember();
    withOrg({ stripeCustomerId: "cus_x" });
    mockCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/pay/cs_test",
    });

    await createCheckoutSession({ priceId: "price_pro_m_test" });

    const callArgs = mockCheckoutCreate.mock.calls[0]?.[0];
    expect(callArgs.success_url).not.toContain("//settings");
    expect(callArgs.success_url).toContain(
      "https://racksmith.example/settings/billing",
    );
  });
});

describe("createCheckoutSession — race-condition recovery", () => {
  it("recovers when updateMany count=0 (lost the conditional-write race)", async () => {
    withMember();
    // Initial findUnique: no customer yet.
    // Second findUnique (post-loss reread): another caller persisted "cus_winner".
    vi.mocked(prisma.organization.findUnique)
      .mockResolvedValueOnce({
        id: "org_1",
        name: "Test Org",
        stripeCustomerId: null,
        members: [{ id: "m1" }],
      } as never)
      .mockResolvedValueOnce({
        stripeCustomerId: "cus_winner",
      } as never);
    mockCustomersCreate.mockResolvedValue({ id: "cus_loser" });
    // Conditional updateMany returns count=0 → we lost.
    vi.mocked(prisma.organization.updateMany).mockResolvedValue({
      count: 0,
    } as never);
    mockCustomersDel.mockResolvedValue({} as never);
    mockCheckoutCreate.mockResolvedValue({
      url: "https://checkout.stripe.com/pay/cs_test",
    });

    const result = await createCheckoutSession({
      priceId: "price_pro_m_test",
    });

    expect(result.ok).toBe(true);
    expect(mockCustomersDel).toHaveBeenCalledWith("cus_loser");
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ customer: "cus_winner" }),
    );
  });

  it("returns a clear error if the post-loss reread comes back empty", async () => {
    withMember();
    vi.mocked(prisma.organization.findUnique)
      .mockResolvedValueOnce({
        id: "org_1",
        name: "Test Org",
        stripeCustomerId: null,
        members: [{ id: "m1" }],
      } as never)
      .mockResolvedValueOnce({ stripeCustomerId: null } as never);
    mockCustomersCreate.mockResolvedValue({ id: "cus_loser" });
    vi.mocked(prisma.organization.updateMany).mockResolvedValue({
      count: 0,
    } as never);
    mockCustomersDel.mockResolvedValue({} as never);

    const result = await createCheckoutSession({
      priceId: "price_pro_m_test",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Please retry/i);
    }
  });
});

// ─── createPortalSession ────────────────────────────────────────────

describe("createPortalSession — auth + config", () => {
  it("rejects when the org has no stripeCustomerId (free org)", async () => {
    withMember();
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      stripeCustomerId: null,
    } as never);

    const result = await createPortalSession();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/No billing customer/i);
    }
    expect(mockPortalCreate).not.toHaveBeenCalled();
  });

  it("rejects when BETTER_AUTH_URL is unset", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("BETTER_AUTH_URL", "");
    withMember();
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      stripeCustomerId: "cus_x",
    } as never);

    const result = await createPortalSession();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/BETTER_AUTH_URL/);
    }
    expect(mockPortalCreate).not.toHaveBeenCalled();
  });

  it("translates a real ForbiddenError into ok:false (member rank)", async () => {
    mockRequireMember.mockRejectedValue(
      new ForbiddenError("members can't open the portal"),
    );

    const result = await createPortalSession();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/members can't open/i);
    }
  });
});

describe("createPortalSession — happy path", () => {
  it("opens a portal session and returns the URL", async () => {
    withMember();
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      stripeCustomerId: "cus_x",
    } as never);
    mockPortalCreate.mockResolvedValue({
      url: "https://billing.stripe.com/p/session_test",
    });

    const result = await createPortalSession();

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.url).toMatch(/billing\.stripe\.com/);
    }
    expect(mockPortalCreate).toHaveBeenCalledWith({
      customer: "cus_x",
      return_url: "https://test.example/settings/billing",
    });
  });

  it("strips trailing slashes from BETTER_AUTH_URL", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("BETTER_AUTH_URL", "https://racksmith.example///");
    withMember();
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      stripeCustomerId: "cus_x",
    } as never);
    mockPortalCreate.mockResolvedValue({
      url: "https://billing.stripe.com/p/session_test",
    });

    await createPortalSession();

    expect(mockPortalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        return_url: "https://racksmith.example/settings/billing",
      }),
    );
  });

  it("returns a clear error when Stripe omits the portal URL", async () => {
    withMember();
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      stripeCustomerId: "cus_x",
    } as never);
    mockPortalCreate.mockResolvedValue({ url: null });

    const result = await createPortalSession();

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/portal URL/i);
    }
  });
});
