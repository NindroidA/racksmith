import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { GET as racksGet } from "@/app/api/v1/racks/route";
import { prisma } from "@/lib/prisma";
import {
  seedOrgWithOwner,
  createTestApiKey,
  truncateAll,
} from "../factories";

describe("tier gating", () => {
  beforeEach(async () => {
    await truncateAll();
  });
  afterEach(async () => {
    await truncateAll();
  });

  it("rejects orphan key when org is downgraded from Pro to Free", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);

    // First request works on Pro
    const before = await racksGet(
      new Request("http://x/api/v1/racks", {
        headers: { Authorization: `Bearer ${cleartext}` },
      }),
      { params: Promise.resolve({}) },
    );
    expect(before.status).toBe(200);

    // Downgrade the org to Free (simulates billing failure / plan cancellation)
    await prisma.organization.update({
      where: { id: organization.id },
      data: { plan: "free", planExpiresAt: null },
    });

    // Subsequent request with the SAME key should now 403
    const after = await racksGet(
      new Request("http://x/api/v1/racks", {
        headers: { Authorization: `Bearer ${cleartext}` },
      }),
      { params: Promise.resolve({}) },
    );
    expect(after.status).toBe(403);
    expect((await after.json()).error.code).toBe("forbidden");
  });

  it("Free-tier org (planExpiresAt in past) treats paid plan as downgraded", async () => {
    // Create a Pro org whose plan has already expired
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    await prisma.organization.update({
      where: { id: organization.id },
      data: { planExpiresAt: new Date(Date.now() - 60_000) }, // 60s in the past
    });
    const { cleartext } = await createTestApiKey(organization.id, user.id);

    const res = await racksGet(
      new Request("http://x/api/v1/racks", {
        headers: { Authorization: `Bearer ${cleartext}` },
      }),
      { params: Promise.resolve({}) },
    );
    // requireApiKey resolves plan via the same logic as getOrganizationPlan:
    // expired paid plans downgrade to "free" → apiAccess false → 403.
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("forbidden");
  });
});
