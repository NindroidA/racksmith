import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { GET as racksGet } from "@/app/api/v1/racks/route";
import { GET as rackIdGet } from "@/app/api/v1/racks/[id]/route";
import {
  seedOrgWithOwner,
  createTestApiKey,
  createTestRack,
  truncateAll,
} from "../factories";

describe("cross-tenant isolation (/api/v1)", () => {
  beforeEach(async () => {
    await truncateAll();
  });
  afterEach(async () => {
    await truncateAll();
  });

  it("org A's key cannot list org B's racks", async () => {
    const a = await seedOrgWithOwner({ plan: "pro", slug: "org-a" });
    const b = await seedOrgWithOwner({ plan: "pro", slug: "org-b" });
    // Seed a rack in org B
    await createTestRack(b.organization.id, b.user.id, { name: "B-rack" });
    // Create org A's API key
    const { cleartext } = await createTestApiKey(a.organization.id, a.user.id);

    // List via org A's key — must NOT see org B's rack
    const res = await racksGet(
      new Request("http://x/api/v1/racks", {
        headers: { Authorization: `Bearer ${cleartext}` },
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.racks).toHaveLength(0);
    expect(body.pagination.total).toBe(0);
  });

  it("org A's key cannot read a specific rack belonging to org B (404, not 403)", async () => {
    const a = await seedOrgWithOwner({ plan: "pro", slug: "org-a" });
    const b = await seedOrgWithOwner({ plan: "pro", slug: "org-b" });
    const bRack = await createTestRack(b.organization.id, b.user.id);
    const { cleartext } = await createTestApiKey(a.organization.id, a.user.id);

    const res = await rackIdGet(
      new Request(`http://x/api/v1/racks/${bRack.id}`, {
        headers: { Authorization: `Bearer ${cleartext}` },
      }),
      { params: Promise.resolve({ id: bRack.id }) },
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });
});
