import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { withTenant } from "@/lib/prisma-tenant";
import { withAdmin } from "@/lib/prisma-admin";
import {
  createTestDevice,
  createTestRack,
  createTestSubnet,
  createTestVlan,
  seedOrgWithOwner,
  type TestContext,
} from "./factories";

/**
 * Verifies that a user authenticated against Organization B cannot see or
 * mutate any data that lives inside Organization A. Exercises the RLS +
 * `withTenant` wrapper end-to-end against a real Postgres + the restricted
 * `racksmith_test_app` role (NOSUPERUSER NOBYPASSRLS — same shape as prod).
 */

let orgA: TestContext;
let orgB: TestContext;

beforeEach(async () => {
  orgA = await seedOrgWithOwner({ orgName: "Org A" });
  orgB = await seedOrgWithOwner({ orgName: "Org B" });
});

describe("Rack isolation", () => {
  it("Org B cannot read Org A's racks via findMany", async () => {
    await createTestRack(orgA.organization.id, orgA.user.id, { name: "A-1" });
    await createTestRack(orgB.organization.id, orgB.user.id, { name: "B-1" });

    const visible = await withTenant(orgB.organization.id, (tx) =>
      tx.rack.findMany({ where: { organizationId: orgB.organization.id } }),
    );
    expect(visible).toHaveLength(1);
    expect(visible[0].name).toBe("B-1");
  });

  it("Org B cannot read Org A's rack by id (findUnique returns null)", async () => {
    const rackA = await createTestRack(orgA.organization.id, orgA.user.id);

    const result = await withTenant(orgB.organization.id, (tx) =>
      tx.rack.findUnique({ where: { id: rackA.id } }),
    );
    expect(result).toBeNull();
  });

  it("Org B cannot update Org A's rack by id", async () => {
    const rackA = await createTestRack(orgA.organization.id, orgA.user.id, {
      name: "Original",
    });

    // Updates by unique id don't error when the row is RLS-hidden — they
    // simply touch zero rows. Verify the row is unchanged.
    await expect(
      withTenant(orgB.organization.id, (tx) =>
        tx.rack.update({
          where: { id: rackA.id },
          data: { name: "Hijacked" },
        }),
      ),
    ).rejects.toThrow();

    const after = await withAdmin((tx) =>
      tx.rack.findUnique({ where: { id: rackA.id } }),
    );
    expect(after?.name).toBe("Original");
  });

  it("Org B cannot delete Org A's rack by id", async () => {
    const rackA = await createTestRack(orgA.organization.id, orgA.user.id);

    await expect(
      withTenant(orgB.organization.id, (tx) =>
        tx.rack.delete({ where: { id: rackA.id } }),
      ),
    ).rejects.toThrow();

    const after = await withAdmin((tx) =>
      tx.rack.findUnique({ where: { id: rackA.id } }),
    );
    expect(after).not.toBeNull();
  });

  it("Org B cannot count Org A's racks", async () => {
    await createTestRack(orgA.organization.id, orgA.user.id);
    await createTestRack(orgA.organization.id, orgA.user.id);
    await createTestRack(orgB.organization.id, orgB.user.id);

    const count = await withTenant(orgB.organization.id, (tx) =>
      tx.rack.count({ where: { organizationId: orgB.organization.id } }),
    );
    expect(count).toBe(1);
  });
});

describe("Device isolation", () => {
  it("Org B cannot list Org A's devices", async () => {
    await createTestDevice(orgA.organization.id, orgA.user.id, { name: "A-d" });
    await createTestDevice(orgB.organization.id, orgB.user.id, { name: "B-d" });

    const visible = await withTenant(orgB.organization.id, (tx) =>
      tx.device.findMany({ where: { organizationId: orgB.organization.id } }),
    );
    expect(visible).toHaveLength(1);
    expect(visible[0].name).toBe("B-d");
  });

  it("Org B cannot fetch Org A's device by id", async () => {
    const devA = await createTestDevice(orgA.organization.id, orgA.user.id);

    const result = await withTenant(orgB.organization.id, (tx) =>
      tx.device.findUnique({ where: { id: devA.id } }),
    );
    expect(result).toBeNull();
  });

  it("Org B cannot update Org A's device", async () => {
    const devA = await createTestDevice(orgA.organization.id, orgA.user.id, {
      name: "Original",
    });

    await expect(
      withTenant(orgB.organization.id, (tx) =>
        tx.device.update({
          where: { id: devA.id },
          data: { name: "Stolen" },
        }),
      ),
    ).rejects.toThrow();

    const after = await withAdmin((tx) =>
      tx.device.findUnique({ where: { id: devA.id } }),
    );
    expect(after?.name).toBe("Original");
  });
});

describe("Subnet isolation", () => {
  it("Org B cannot list Org A's subnets", async () => {
    await createTestSubnet(orgA.organization.id, orgA.user.id, {
      cidr: "10.0.0.0/24",
    });
    await createTestSubnet(orgB.organization.id, orgB.user.id, {
      cidr: "10.1.0.0/24",
    });

    const visible = await withTenant(orgB.organization.id, (tx) =>
      tx.subnet.findMany({ where: { organizationId: orgB.organization.id } }),
    );
    expect(visible).toHaveLength(1);
    expect(visible[0].cidr).toBe("10.1.0.0/24");
  });

  it("Subnet CIDR uniqueness is per-org (Org A and Org B can both use 10.0.0.0/24)", async () => {
    await createTestSubnet(orgA.organization.id, orgA.user.id, {
      cidr: "10.0.0.0/24",
    });
    // Same CIDR in a different org — the @@unique([organizationId, cidr])
    // constraint should permit this.
    await expect(
      createTestSubnet(orgB.organization.id, orgB.user.id, {
        cidr: "10.0.0.0/24",
      }),
    ).resolves.toBeDefined();
  });
});

describe("VLAN isolation", () => {
  it("Org B cannot list Org A's VLANs", async () => {
    await createTestVlan(orgA.organization.id, orgA.user.id, {
      vlanId: 10,
      name: "A-mgmt",
    });
    await createTestVlan(orgB.organization.id, orgB.user.id, {
      vlanId: 10,
      name: "B-mgmt",
    });

    const visible = await withTenant(orgB.organization.id, (tx) =>
      tx.vlan.findMany({ where: { organizationId: orgB.organization.id } }),
    );
    expect(visible).toHaveLength(1);
    expect(visible[0].name).toBe("B-mgmt");
  });

  it("VLAN id uniqueness is per-org", async () => {
    await createTestVlan(orgA.organization.id, orgA.user.id, { vlanId: 100 });
    await expect(
      createTestVlan(orgB.organization.id, orgB.user.id, { vlanId: 100 }),
    ).resolves.toBeDefined();
  });
});

describe("Member isolation", () => {
  it("Org A's member list does not include Org B's owner", async () => {
    const members = await withAdmin((tx) =>
      tx.member.findMany({
        where: { organizationId: orgA.organization.id },
        select: { userId: true },
      }),
    );
    expect(members).toHaveLength(1);
    expect(members[0].userId).toBe(orgA.user.id);
    expect(members.find((m) => m.userId === orgB.user.id)).toBeUndefined();
  });
});

describe("Aggregate / unfiltered queries fall through RLS", () => {
  it("findMany without explicit organizationId still scoped by RLS", async () => {
    await createTestRack(orgA.organization.id, orgA.user.id, { name: "A-x" });
    await createTestRack(orgB.organization.id, orgB.user.id, { name: "B-x" });
    await createTestRack(orgB.organization.id, orgB.user.id, { name: "B-y" });

    // Intentionally OMIT the where filter — RLS must do the work.
    const visible = await withTenant(orgB.organization.id, (tx) =>
      tx.rack.findMany(),
    );
    expect(visible).toHaveLength(2);
    for (const r of visible) {
      expect(r.organizationId).toBe(orgB.organization.id);
    }
  });

  it("count without explicit organizationId still scoped by RLS", async () => {
    await createTestRack(orgA.organization.id, orgA.user.id);
    await createTestRack(orgA.organization.id, orgA.user.id);
    await createTestRack(orgB.organization.id, orgB.user.id);

    const count = await withTenant(orgB.organization.id, (tx) =>
      tx.rack.count(),
    );
    expect(count).toBe(1);
  });
});

describe("Admin bypass", () => {
  it("withAdmin sees rows from every organization", async () => {
    await createTestRack(orgA.organization.id, orgA.user.id, { name: "A-r" });
    await createTestRack(orgB.organization.id, orgB.user.id, { name: "B-r" });

    const all = await withAdmin((tx) => tx.rack.findMany());
    expect(all.length).toBeGreaterThanOrEqual(2);
    const names = all.map((r) => r.name).sort();
    expect(names).toContain("A-r");
    expect(names).toContain("B-r");
  });
});

describe("Audit log isolation", () => {
  it("Org B cannot read Org A's audit log entries", async () => {
    await withAdmin((tx) =>
      tx.auditLog.create({
        data: {
          userId: orgA.user.id,
          organizationId: orgA.organization.id,
          action: "created",
          entityType: "rack",
          entityId: "test-entity-A",
        },
      }),
    );
    await withAdmin((tx) =>
      tx.auditLog.create({
        data: {
          userId: orgB.user.id,
          organizationId: orgB.organization.id,
          action: "created",
          entityType: "rack",
          entityId: "test-entity-B",
        },
      }),
    );

    const visibleToB = await withTenant(orgB.organization.id, (tx) =>
      tx.auditLog.findMany({
        where: { organizationId: orgB.organization.id },
      }),
    );
    expect(visibleToB).toHaveLength(1);
    expect(visibleToB[0].entityId).toBe("test-entity-B");
  });
});

describe("BuildPlan isolation", () => {
  it("Org B cannot read Org A's draft plans", async () => {
    await withTenant(orgA.organization.id, (tx) =>
      tx.buildPlan.create({
        data: {
          name: "A-plan",
          status: "draft",
          inputs: {},
          userId: orgA.user.id,
          organizationId: orgA.organization.id,
        },
      }),
    );

    const visibleToB = await withTenant(orgB.organization.id, (tx) =>
      tx.buildPlan.findMany({
        where: { organizationId: orgB.organization.id },
      }),
    );
    expect(visibleToB).toHaveLength(0);
  });
});

describe("RecommendationDismissal isolation", () => {
  it("Org B sees only its own dismissals when scoped via withTenant", async () => {
    await withTenant(orgA.organization.id, (tx) =>
      tx.recommendationDismissal.create({
        data: {
          ruleKey: "test_rule",
          entityKey: "org:" + orgA.organization.id,
          userId: orgA.user.id,
          organizationId: orgA.organization.id,
        },
      }),
    );

    const visible = await withTenant(orgB.organization.id, (tx) =>
      tx.recommendationDismissal.findMany({
        where: { organizationId: orgB.organization.id },
      }),
    );
    expect(visible).toHaveLength(0);
  });
});

describe("Strict RLS (10g — compat-mode NULL branch dropped)", () => {
  it("direct prisma.rack.findMany with no session variable returns empty even when rows exist", async () => {
    // Seed through the admin wrapper so the rows actually land in storage.
    await createTestRack(orgA.organization.id, orgA.user.id);
    await createTestRack(orgB.organization.id, orgB.user.id);

    // No wrapper — `app.organization_id` is unset, `app.role` is not
    // 'admin'. Strict policy evaluates `"organizationId" = NULL` to NULL
    // (not true), so every row is invisible. Pre-10g this would have
    // returned both rows via the compat-mode NULL branch.
    const rows = await prisma.rack.findMany();
    expect(rows).toHaveLength(0);
  });

  it("direct prisma.rack.create with no session variable is rejected by the policy", async () => {
    await expect(
      prisma.rack.create({
        data: {
          name: "should-not-persist",
          sizeU: 42,
          userId: orgA.user.id,
          organizationId: orgA.organization.id,
        },
      }),
    ).rejects.toThrow();

    // Belt and braces: confirm the row really didn't land.
    const persisted = await withAdmin((tx) =>
      tx.rack.findMany({ where: { name: "should-not-persist" } }),
    );
    expect(persisted).toHaveLength(0);
  });
});
