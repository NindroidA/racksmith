import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Hoisted mocks ──────────────────────────────────────────────────

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ origin: "https://test.example" })),
}));

const mockRequireMember = vi.fn();
vi.mock("@/lib/auth-helpers", () => ({
  requireMember: (...args: unknown[]) => mockRequireMember(...args),
  ForbiddenError: class extends Error {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  audit: vi.fn(async () => undefined),
}));

const mockCustomersCreate = vi.fn();
const mockCustomersDel = vi.fn();
const mockCheckoutCreate = vi.fn();

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
  },
  STRIPE_PRICE_IDS: {
    pro_monthly: "price_pro_m_test",
    pro_annual: "price_pro_a_test",
    business_monthly: "price_biz_m_test",
    business_annual: "price_biz_a_test",
  },
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
import { createCheckoutSession } from "./actions";

// ─── Test fixtures ──────────────────────────────────────────────────

function withMember(opts: {
  emailVerified?: boolean;
  role?: "admin" | "owner" | "member";
  userId?: string;
  email?: string;
} = {}) {
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

function withOrg(opts: {
  stripeCustomerId?: string | null;
  memberCount?: number;
  name?: string;
} = {}) {
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
    // Stripe must not be touched if the email gate fails
    expect(mockCustomersCreate).not.toHaveBeenCalled();
    expect(mockCheckoutCreate).not.toHaveBeenCalled();
  });

  it("translates a thrown ForbiddenError into ok:false (member rank)", async () => {
    mockRequireMember.mockRejectedValue(
      Object.assign(new Error("member can't bill"), { name: "ForbiddenError" }),
    );
    const result = await createCheckoutSession({
      priceId: "price_pro_m_test",
    });
    expect(result.ok).toBe(false);
  });
});

describe("createCheckoutSession — happy path", () => {
  it("creates a Stripe customer lazily and persists it", async () => {
    withMember();
    withOrg({ stripeCustomerId: null, memberCount: 1 });
    mockCustomersCreate.mockResolvedValue({ id: "cus_new" });
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
    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: "org_1" },
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
});

describe("createCheckoutSession — race-condition recovery", () => {
  it("recovers from a P2002 unique-constraint loss by re-reading the winning customer", async () => {
    withMember();
    // First findUnique (initial fetch): no customer yet
    // Second findUnique (post-P2002 reread): another concurrent caller persisted "cus_winner"
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
    vi.mocked(prisma.organization.update).mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );
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

  it("returns a clear error if the post-P2002 reread comes back empty", async () => {
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
    vi.mocked(prisma.organization.update).mockRejectedValue(
      Object.assign(new Error("Unique constraint failed"), { code: "P2002" }),
    );
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
