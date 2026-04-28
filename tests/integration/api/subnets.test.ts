import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as listGet, POST as listPost } from "@/app/api/v1/subnets/route";
import {
  GET as idGet,
  PATCH as idPatch,
  DELETE as idDelete,
} from "@/app/api/v1/subnets/[id]/route";
import {
  createTestApiKey,
  createTestSubnet,
  seedOrgWithOwner,
  truncateAll,
} from "../factories";

/**
 * End-to-end integration suite for /api/v1/subnets. Mirrors the racks/devices
 * suite shape: real handlers + real Postgres + RLS-enforced app role. New for
 * Phase 12: P2002 unique-constraint surfacing as 409 conflict (subnets are the
 * first resource with a non-id unique constraint exposed via the public API),
 * and the `vlanId` FK validation path.
 */
describe("/api/v1/subnets", () => {
  beforeEach(async () => {
    await truncateAll();
  });
  afterEach(async () => {
    await truncateAll();
  });

  it("creates, reads, updates, deletes a subnet end-to-end", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id, {
      role: "admin",
    });
    const auth = { Authorization: `Bearer ${cleartext}` };

    // Create
    const createRes = await listPost(
      new Request("http://x/api/v1/subnets", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ cidr: "10.0.0.0/24", name: "Mgmt LAN" }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()).subnet;
    expect(created.cidr).toBe("10.0.0.0/24");
    expect(created.name).toBe("Mgmt LAN");
    expect(created.color).toBe("blue"); // default
    expect(created.vlanId).toBeNull(); // default

    // List
    const listRes = await listGet(
      new Request("http://x/api/v1/subnets", { headers: auth }),
      { params: Promise.resolve({}) },
    );
    expect(listRes.status).toBe(200);
    const listed = await listRes.json();
    expect(listed.subnets.map((s: { id: string }) => s.id)).toContain(
      created.id,
    );
    expect(listed.pagination.total).toBe(1);

    // Get one
    const getRes = await idGet(
      new Request(`http://x/api/v1/subnets/${created.id}`, { headers: auth }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(getRes.status).toBe(200);

    // Update
    const patchRes = await idPatch(
      new Request(`http://x/api/v1/subnets/${created.id}`, {
        method: "PATCH",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Mgmt LAN (renamed)" }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(patchRes.status).toBe(200);
    expect((await patchRes.json()).subnet.name).toBe("Mgmt LAN (renamed)");

    // Delete
    const delRes = await idDelete(
      new Request(`http://x/api/v1/subnets/${created.id}`, {
        method: "DELETE",
        headers: auth,
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(delRes.status).toBe(204);
  });

  it("rejects unknown body fields (mass-assignment)", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const res = await listPost(
      new Request("http://x/api/v1/subnets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleartext}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cidr: "10.0.0.0/24",
          name: "x",
          organizationId: "OTHER",
        }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("validation_failed");
  });

  it("returns 409 conflict on duplicate CIDR within the same org", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const auth = { Authorization: `Bearer ${cleartext}` };

    // First create succeeds
    await listPost(
      new Request("http://x/api/v1/subnets", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ cidr: "10.0.0.0/24", name: "Mgmt" }),
      }),
      { params: Promise.resolve({}) },
    );

    // Duplicate CIDR → 409 conflict
    const dupRes = await listPost(
      new Request("http://x/api/v1/subnets", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ cidr: "10.0.0.0/24", name: "Other" }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(dupRes.status).toBe(409);
    expect((await dupRes.json()).error.code).toBe("conflict");
  });

  it("rejects malformed CIDR (no prefix length)", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const res = await listPost(
      new Request("http://x/api/v1/subnets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleartext}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cidr: "10.0.0.0", name: "Bad" }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("validation_failed");
  });

  it("filters list by vlanId query param", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    await createTestSubnet(organization.id, user.id, { cidr: "10.0.0.0/24" });
    await createTestSubnet(organization.id, user.id, { cidr: "10.0.1.0/24" });

    // No filter — both visible
    const allRes = await listGet(
      new Request("http://x/api/v1/subnets", {
        headers: { Authorization: `Bearer ${cleartext}` },
      }),
      { params: Promise.resolve({}) },
    );
    expect((await allRes.json()).pagination.total).toBe(2);

    // Filter by a non-existent vlanId — should return zero
    const filteredRes = await listGet(
      new Request(
        "http://x/api/v1/subnets?vlanId=cmoc7jpxl000n6dtbamrx2lug",
        { headers: { Authorization: `Bearer ${cleartext}` } },
      ),
      { params: Promise.resolve({}) },
    );
    expect(filteredRes.status).toBe(200);
    expect((await filteredRes.json()).pagination.total).toBe(0);
  });

  it("member key cannot DELETE (403)", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id, {
      role: "member",
    });
    const subnet = await createTestSubnet(organization.id, user.id);
    const res = await idDelete(
      new Request(`http://x/api/v1/subnets/${subnet.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${cleartext}` },
      }),
      { params: Promise.resolve({ id: subnet.id }) },
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("forbidden");
  });

  it("free-tier key is rejected with 403 (apiAccess=false)", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "free" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const res = await listGet(
      new Request("http://x/api/v1/subnets", {
        headers: { Authorization: `Bearer ${cleartext}` },
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("forbidden");
  });

  it("revoked key returns 401 unauthorized", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id, {
      revoked: true,
    });
    const res = await listGet(
      new Request("http://x/api/v1/subnets", {
        headers: { Authorization: `Bearer ${cleartext}` },
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("unauthorized");
  });

  it("missing Authorization header returns 401", async () => {
    const res = await listGet(new Request("http://x/api/v1/subnets"), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 for cross-tenant fetch (no info leak)", async () => {
    // Org A creates a subnet; Org B's key tries to GET by ID.
    const a = await seedOrgWithOwner({ plan: "pro", orgName: "Org A" });
    const b = await seedOrgWithOwner({ plan: "pro", orgName: "Org B" });
    const subnetA = await createTestSubnet(a.organization.id, a.user.id);
    const { cleartext: bKey } = await createTestApiKey(
      b.organization.id,
      b.user.id,
    );

    const res = await idGet(
      new Request(`http://x/api/v1/subnets/${subnetA.id}`, {
        headers: { Authorization: `Bearer ${bKey}` },
      }),
      { params: Promise.resolve({ id: subnetA.id }) },
    );
    expect(res.status).toBe(404);
  });
});
