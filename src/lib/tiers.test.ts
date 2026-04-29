import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks. Tiers reads `prisma.organization.findUnique` /
// `prisma.member.findMany` and runs reads inside `withTenant`. The test
// substitutes both so plan resolution + count-based gates can be exercised
// without standing up a DB.
const mockTx = {
  rack: { count: vi.fn() },
  device: { count: vi.fn() },
  subnet: { count: vi.fn() },
  vlan: { count: vi.fn() },
  buildPlan: { count: vi.fn() },
};

vi.mock("./prisma", () => ({
  prisma: {
    organization: { findUnique: vi.fn() },
    member: { findMany: vi.fn() },
  },
}));

vi.mock("./prisma-tenant", () => ({
  withTenant: vi.fn(
    async (_orgId: string, fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx),
  ),
  acquireTenantResourceLock: vi.fn(async () => undefined),
}));

import { prisma } from "./prisma";
import {
  canCreateDevice,
  canCreatePlan,
  canCreateRack,
  canCreateSubnet,
  canCreateVlan,
  canExportAuditLog,
  canExportFormat,
  getEffectivePlan,
  getLimits,
  getMembershipLimitForOrganization,
  getOrganizationLimitForUser,
  getOrganizationPlan,
  getUsageSummary,
  isPlan,
  PLANS,
  TIER_LIMITS,
} from "./tiers";

beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

// ── Static tier shape ───────────────────────────────────────────────

describe("tier shape sanity", () => {
  it("free tier denies API access", () => {
    expect(TIER_LIMITS.free.apiAccess).toBe(false);
    expect(TIER_LIMITS.free.apiRateLimitPerMinute).toBe(0);
    expect(TIER_LIMITS.free.apiKeyMax).toBe(0);
  });
  it("pro tier has moderate API quotas", () => {
    expect(TIER_LIMITS.pro.apiAccess).toBe(true);
    expect(TIER_LIMITS.pro.apiRateLimitPerMinute).toBe(120);
    expect(TIER_LIMITS.pro.apiKeyMax).toBe(5);
  });
  it("business tier has generous API quotas", () => {
    expect(TIER_LIMITS.business.apiAccess).toBe(true);
    expect(TIER_LIMITS.business.apiRateLimitPerMinute).toBe(1200);
    expect(TIER_LIMITS.business.apiKeyMax).toBe(50);
  });
  it("limits monotonically grow free → pro → business", () => {
    for (const resource of ["racks", "devices", "subnets", "vlans"] as const) {
      expect(TIER_LIMITS.pro[resource]).toBeGreaterThanOrEqual(
        TIER_LIMITS.free[resource] as number,
      );
      expect(TIER_LIMITS.business[resource]).toBeGreaterThanOrEqual(
        TIER_LIMITS.pro[resource],
      );
    }
  });
});

describe("isPlan", () => {
  it.each(PLANS)("accepts canonical plan %s", (plan) => {
    expect(isPlan(plan)).toBe(true);
  });
  it.each(["", "FREE", "Pro", "enterprise", "trial"])("rejects %j", (value) => {
    expect(isPlan(value)).toBe(false);
  });
});

// ── Plan resolution ─────────────────────────────────────────────────

describe("getEffectivePlan", () => {
  it("normalizes 'pro' / 'business' as-is, anything else → free", () => {
    expect(getEffectivePlan("free")).toBe("free");
    expect(getEffectivePlan("pro")).toBe("pro");
    expect(getEffectivePlan("business")).toBe("business");
    expect(getEffectivePlan(null)).toBe("free");
    expect(getEffectivePlan(undefined)).toBe("free");
    expect(getEffectivePlan("trial")).toBe("free");
    expect(getEffectivePlan("")).toBe("free");
  });

  it("returns 'business' when dev-bypass env is set (and not in production)", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RACKSMITH_DEV_BYPASS_TIERS", "true");
    expect(getEffectivePlan("free")).toBe("business");
  });

  it("ignores the dev-bypass env in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RACKSMITH_DEV_BYPASS_TIERS", "true");
    expect(getEffectivePlan("free")).toBe("free");
  });

  it("accepts both '1' and 'true' as the bypass flag (and nothing else)", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RACKSMITH_DEV_BYPASS_TIERS", "1");
    expect(getEffectivePlan("free")).toBe("business");
    vi.stubEnv("RACKSMITH_DEV_BYPASS_TIERS", "true");
    expect(getEffectivePlan("free")).toBe("business");
    vi.stubEnv("RACKSMITH_DEV_BYPASS_TIERS", "yes");
    expect(getEffectivePlan("free")).toBe("free");
  });
});

describe("getOrganizationPlan", () => {
  it("returns 'free' when organization is missing", async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue(null);
    expect(await getOrganizationPlan("missing")).toBe("free");
  });

  it("returns the stored plan when not expired", async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      plan: "pro",
      planExpiresAt: new Date(Date.now() + 60_000),
    } as never);
    expect(await getOrganizationPlan("org_1")).toBe("pro");
  });

  it("returns the stored plan when planExpiresAt is null (perpetual)", async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      plan: "business",
      planExpiresAt: null,
    } as never);
    expect(await getOrganizationPlan("org_1")).toBe("business");
  });

  it("downgrades to 'free' when planExpiresAt is in the past", async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      plan: "pro",
      planExpiresAt: new Date(Date.now() - 1),
    } as never);
    expect(await getOrganizationPlan("org_1")).toBe("free");
  });

  it("dev-bypass short-circuits the DB lookup", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RACKSMITH_DEV_BYPASS_TIERS", "1");
    expect(await getOrganizationPlan("org_1")).toBe("business");
    expect(prisma.organization.findUnique).not.toHaveBeenCalled();
  });

  it("downgrades to 'free' when paymentStatus is canceled (Phase 13)", async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      plan: "pro",
      planExpiresAt: new Date(Date.now() + 60_000),
      paymentStatus: "canceled",
    } as never);
    expect(await getOrganizationPlan("org_1")).toBe("free");
  });

  it("keeps the plan when paymentStatus is past_due (grace period)", async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      plan: "pro",
      planExpiresAt: new Date(Date.now() + 60_000),
      paymentStatus: "past_due",
    } as never);
    expect(await getOrganizationPlan("org_1")).toBe("pro");
  });

  it("keeps the plan when paymentStatus is null (legacy / pre-Stripe orgs)", async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({
      plan: "pro",
      planExpiresAt: null,
      paymentStatus: null,
    } as never);
    expect(await getOrganizationPlan("org_1")).toBe("pro");
  });
});

describe("getLimits", () => {
  it("returns the tier object for each plan", () => {
    expect(getLimits("free")).toBe(TIER_LIMITS.free);
    expect(getLimits("pro")).toBe(TIER_LIMITS.pro);
    expect(getLimits("business")).toBe(TIER_LIMITS.business);
  });
});

// ── Count-based gates (canCreateX) ──────────────────────────────────

const mockOrgPlan = (plan: string) => {
  vi.mocked(prisma.organization.findUnique).mockResolvedValue({
    plan,
    planExpiresAt: null,
  } as never);
};

describe("canCreateRack / Device / Subnet / Vlan / Plan (free tier)", () => {
  it("returns ok:true when current < limit (rack at 2/3)", async () => {
    mockOrgPlan("free");
    mockTx.rack.count.mockResolvedValue(2);
    const result = await canCreateRack("org_1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result).toMatchObject({ plan: "free", current: 2, limit: 3 });
    }
  });

  it("returns ok:false at exactly the cap (rack at 3/3)", async () => {
    mockOrgPlan("free");
    mockTx.rack.count.mockResolvedValue(3);
    const result = await canCreateRack("org_1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result).toMatchObject({
        plan: "free",
        current: 3,
        limit: 3,
        resource: "racks",
      });
      expect(result.reason).toContain("Free tier");
      expect(result.reason).toContain("3 racks");
    }
  });

  it("returns ok:false above the cap (rack at 5/3 — historic data)", async () => {
    mockOrgPlan("free");
    mockTx.rack.count.mockResolvedValue(5);
    const result = await canCreateRack("org_1");
    expect(result.ok).toBe(false);
  });

  it("singular vs plural noun: '1 plan' not '1 plans' at the cap", async () => {
    mockOrgPlan("free");
    mockTx.buildPlan.count.mockResolvedValue(1);
    const result = await canCreatePlan("org_1");
    if (!result.ok) {
      expect(result.reason).toContain("1 plan.");
    }
  });

  it("plural noun: '3 racks' (not 'rack') at the cap", async () => {
    mockOrgPlan("free");
    mockTx.rack.count.mockResolvedValue(3);
    const result = await canCreateRack("org_1");
    if (!result.ok) {
      expect(result.reason).toContain("3 racks");
    }
  });

  it("device cap at 30", async () => {
    mockOrgPlan("free");
    mockTx.device.count.mockResolvedValue(30);
    const result = await canCreateDevice("org_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.limit).toBe(30);
  });

  it("subnet cap at 3", async () => {
    mockOrgPlan("free");
    mockTx.subnet.count.mockResolvedValue(3);
    const result = await canCreateSubnet("org_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.limit).toBe(3);
  });

  it("vlan cap at 5", async () => {
    mockOrgPlan("free");
    mockTx.vlan.count.mockResolvedValue(5);
    const result = await canCreateVlan("org_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.limit).toBe(5);
  });
});

describe("canCreateRack / Device / Subnet / Vlan (pro tier)", () => {
  it("Infinity limits never deny", async () => {
    mockOrgPlan("pro");
    mockTx.rack.count.mockResolvedValue(1_000_000);
    const result = await canCreateRack("org_1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan).toBe("pro");
      expect(result.limit).toBe(Infinity);
    }
  });

  it("only counts draft plans (status: draft)", async () => {
    mockOrgPlan("pro");
    mockTx.buildPlan.count.mockResolvedValue(0);
    await canCreatePlan("org_1");
    expect(mockTx.buildPlan.count).toHaveBeenCalledWith({
      where: { organizationId: "org_1", status: "draft" },
    });
  });
});

// ── Feature gates ───────────────────────────────────────────────────

describe("canExportAuditLog", () => {
  it("denies on free", async () => {
    mockOrgPlan("free");
    const result = await canExportAuditLog("org_1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Pro or Business/);
  });

  it("allows on pro", async () => {
    mockOrgPlan("pro");
    expect((await canExportAuditLog("org_1")).ok).toBe(true);
  });

  it("allows on business", async () => {
    mockOrgPlan("business");
    expect((await canExportAuditLog("org_1")).ok).toBe(true);
  });
});

describe("canExportFormat", () => {
  it("free can export PNG only", async () => {
    mockOrgPlan("free");
    expect((await canExportFormat("org_1", "png")).ok).toBe(true);
    expect((await canExportFormat("org_1", "csv")).ok).toBe(false);
    expect((await canExportFormat("org_1", "pdf")).ok).toBe(false);
    expect((await canExportFormat("org_1", "svg")).ok).toBe(false);
  });

  it("pro can export all listed formats", async () => {
    mockOrgPlan("pro");
    for (const fmt of ["png", "pdf", "csv", "svg"]) {
      expect((await canExportFormat("org_1", fmt)).ok).toBe(true);
    }
  });

  it("denial reason mentions the requested format in upper-case", async () => {
    mockOrgPlan("free");
    const result = await canExportFormat("org_1", "csv");
    if (!result.ok) expect(result.reason).toMatch(/^CSV export/);
  });
});

// ── Membership caps ─────────────────────────────────────────────────

describe("getOrganizationLimitForUser", () => {
  it("returns 3 for a user with no memberships (treated as free)", async () => {
    vi.mocked(prisma.member.findMany).mockResolvedValue([]);
    expect(await getOrganizationLimitForUser("user_1")).toBe(3);
  });

  it("returns 3 for a user whose only membership is in a free org", async () => {
    vi.mocked(prisma.member.findMany).mockResolvedValue([
      { organization: { plan: "free", planExpiresAt: null } },
    ] as never);
    expect(await getOrganizationLimitForUser("user_1")).toBe(3);
  });

  it("returns 10 when the highest membership is pro", async () => {
    vi.mocked(prisma.member.findMany).mockResolvedValue([
      { organization: { plan: "free", planExpiresAt: null } },
      { organization: { plan: "pro", planExpiresAt: null } },
    ] as never);
    expect(await getOrganizationLimitForUser("user_1")).toBe(10);
  });

  it("returns Infinity when any membership is business (short-circuits)", async () => {
    vi.mocked(prisma.member.findMany).mockResolvedValue([
      { organization: { plan: "free", planExpiresAt: null } },
      { organization: { plan: "business", planExpiresAt: null } },
      { organization: { plan: "pro", planExpiresAt: null } },
    ] as never);
    expect(await getOrganizationLimitForUser("user_1")).toBe(Infinity);
  });

  it("treats expired pro / business memberships as free", async () => {
    vi.mocked(prisma.member.findMany).mockResolvedValue([
      {
        organization: {
          plan: "pro",
          planExpiresAt: new Date(Date.now() - 1),
        },
      },
      {
        organization: {
          plan: "business",
          planExpiresAt: new Date(Date.now() - 1),
        },
      },
    ] as never);
    expect(await getOrganizationLimitForUser("user_1")).toBe(3);
  });

  it("dev-bypass returns Infinity without hitting Prisma", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RACKSMITH_DEV_BYPASS_TIERS", "1");
    expect(await getOrganizationLimitForUser("user_1")).toBe(Infinity);
    expect(prisma.member.findMany).not.toHaveBeenCalled();
  });
});

describe("getMembershipLimitForOrganization", () => {
  it("free → 1", async () => {
    mockOrgPlan("free");
    expect(await getMembershipLimitForOrganization("org_1")).toBe(1);
  });
  it("pro → 5", async () => {
    mockOrgPlan("pro");
    expect(await getMembershipLimitForOrganization("org_1")).toBe(5);
  });
  it("business → Infinity", async () => {
    mockOrgPlan("business");
    expect(await getMembershipLimitForOrganization("org_1")).toBe(Infinity);
  });
});

// ── UsageSummary ────────────────────────────────────────────────────

describe("getUsageSummary", () => {
  it("aggregates counts and surfaces null limits for unlimited tiers", async () => {
    mockOrgPlan("pro");
    mockTx.rack.count.mockResolvedValue(7);
    mockTx.device.count.mockResolvedValue(123);
    mockTx.subnet.count.mockResolvedValue(4);
    mockTx.vlan.count.mockResolvedValue(2);
    mockTx.buildPlan.count.mockResolvedValue(1);

    const summary = await getUsageSummary("org_1");
    expect(summary).toMatchObject({
      plan: "pro",
      planLabel: "Pro",
      racks: { current: 7, limit: null },
      devices: { current: 123, limit: null },
      subnets: { current: 4, limit: null },
      vlans: { current: 2, limit: null },
      plans: { current: 1, limit: null },
    });
  });

  it("derives sites=1 when at least one rack exists, 0 otherwise", async () => {
    mockOrgPlan("free");
    mockTx.rack.count.mockResolvedValue(0);
    mockTx.device.count.mockResolvedValue(0);
    mockTx.subnet.count.mockResolvedValue(0);
    mockTx.vlan.count.mockResolvedValue(0);
    mockTx.buildPlan.count.mockResolvedValue(0);
    let summary = await getUsageSummary("org_1");
    expect(summary.sites.current).toBe(0);

    mockTx.rack.count.mockResolvedValue(1);
    summary = await getUsageSummary("org_1");
    expect(summary.sites.current).toBe(1);
  });

  it("preserves finite limits on free tier (limit !== null)", async () => {
    mockOrgPlan("free");
    mockTx.rack.count.mockResolvedValue(2);
    mockTx.device.count.mockResolvedValue(10);
    mockTx.subnet.count.mockResolvedValue(0);
    mockTx.vlan.count.mockResolvedValue(0);
    mockTx.buildPlan.count.mockResolvedValue(0);
    const summary = await getUsageSummary("org_1");
    expect(summary.racks.limit).toBe(3);
    expect(summary.devices.limit).toBe(30);
  });
});
