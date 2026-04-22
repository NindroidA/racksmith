import { beforeEach, afterEach, describe, expect, it } from "vitest";
import { GET as listGet, POST as listPost } from "@/app/api/v1/devices/route";
import {
  GET as idGet,
  PATCH as idPatch,
  DELETE as idDelete,
} from "@/app/api/v1/devices/[id]/route";
import {
  seedOrgWithOwner,
  createTestApiKey,
  createTestRack,
  truncateAll,
} from "../factories";

describe("/api/v1/devices", () => {
  beforeEach(async () => {
    await truncateAll();
  });
  afterEach(async () => {
    await truncateAll();
  });

  it("full CRUD end-to-end", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const rack = await createTestRack(organization.id, user.id);
    const { cleartext } = await createTestApiKey(organization.id, user.id, {
      role: "admin",
    });
    const auth = { Authorization: `Bearer ${cleartext}` };

    // Create
    const createRes = await listPost(
      new Request("http://x/api/v1/devices", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "sw-1",
          deviceType: "switch",
          sizeU: 1,
          portCount: 24,
          rackId: rack.id,
        }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(createRes.status).toBe(201);
    const { device } = await createRes.json();
    expect(device.rackId).toBe(rack.id);
    expect(device.name).toBe("sw-1");

    // Get one
    const getRes = await idGet(
      new Request(`http://x/api/v1/devices/${device.id}`, { headers: auth }),
      { params: Promise.resolve({ id: device.id }) },
    );
    expect(getRes.status).toBe(200);
    expect((await getRes.json()).device.id).toBe(device.id);

    // Update (partial: only portCount)
    const patchRes = await idPatch(
      new Request(`http://x/api/v1/devices/${device.id}`, {
        method: "PATCH",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ portCount: 48 }),
      }),
      { params: Promise.resolve({ id: device.id }) },
    );
    expect(patchRes.status).toBe(200);
    const updated = (await patchRes.json()).device;
    expect(updated.portCount).toBe(48);
    expect(updated.name).toBe("sw-1"); // unchanged — partial update worked

    // Delete (admin-role key required — we created with role: "admin")
    const delRes = await idDelete(
      new Request(`http://x/api/v1/devices/${device.id}`, {
        method: "DELETE",
        headers: auth,
      }),
      { params: Promise.resolve({ id: device.id }) },
    );
    expect(delRes.status).toBe(204);
  });

  it("rejects unknown rackId with 404 (cross-tenant enumeration defense)", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const res = await listPost(
      new Request("http://x/api/v1/devices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleartext}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "sw-1",
          deviceType: "switch",
          sizeU: 1,
          portCount: 24,
          rackId: "ckqqqqqqqqqqqqqqqqqqqqqqq", // well-formed CUID, doesn't exist
        }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });

  it("cannot attach to a rack from another org (404, not 403)", async () => {
    const orgA = await seedOrgWithOwner({ plan: "pro", slug: "org-a" });
    const orgB = await seedOrgWithOwner({ plan: "pro", slug: "org-b" });
    const rackB = await createTestRack(orgB.organization.id, orgB.user.id);
    const { cleartext } = await createTestApiKey(
      orgA.organization.id,
      orgA.user.id,
    );
    const res = await listPost(
      new Request("http://x/api/v1/devices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleartext}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "sw-1",
          deviceType: "switch",
          sizeU: 1,
          portCount: 24,
          rackId: rackB.id, // valid CUID, belongs to another org
        }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });

  it("creates a rackless device (unplaced)", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const res = await listPost(
      new Request("http://x/api/v1/devices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleartext}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "standalone",
          deviceType: "router",
          sizeU: 1,
          portCount: 4,
          // rackId omitted → null default per schema
        }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(201);
    expect((await res.json()).device.rackId).toBeNull();
  });

  it("filters list by rackId", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const rackA = await createTestRack(organization.id, user.id);
    const rackB = await createTestRack(organization.id, user.id);
    const { cleartext } = await createTestApiKey(organization.id, user.id, {
      role: "admin",
    });
    const auth = {
      Authorization: `Bearer ${cleartext}`,
      "Content-Type": "application/json",
    };

    await listPost(
      new Request("http://x/api/v1/devices", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({
          name: "A1",
          deviceType: "switch",
          sizeU: 1,
          portCount: 24,
          rackId: rackA.id,
        }),
      }),
      { params: Promise.resolve({}) },
    );
    await listPost(
      new Request("http://x/api/v1/devices", {
        method: "POST",
        headers: auth,
        body: JSON.stringify({
          name: "B1",
          deviceType: "switch",
          sizeU: 1,
          portCount: 24,
          rackId: rackB.id,
        }),
      }),
      { params: Promise.resolve({}) },
    );

    const res = await listGet(
      new Request(`http://x/api/v1/devices?rackId=${rackA.id}`, {
        headers: { Authorization: `Bearer ${cleartext}` },
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.devices).toHaveLength(1);
    expect(body.devices[0].name).toBe("A1");
    expect(body.pagination.total).toBe(1);
  });

  it("member role cannot DELETE (403)", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id, {
      role: "member",
    });
    // Create a device first via admin key so we have something to target
    const { cleartext: adminKey } = await createTestApiKey(
      organization.id,
      user.id,
      { role: "admin", name: "admin-key" },
    );
    const createRes = await listPost(
      new Request("http://x/api/v1/devices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${adminKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "target",
          deviceType: "switch",
          sizeU: 1,
          portCount: 24,
        }),
      }),
      { params: Promise.resolve({}) },
    );
    const { device } = await createRes.json();

    const delRes = await idDelete(
      new Request(`http://x/api/v1/devices/${device.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${cleartext}` },
      }),
      { params: Promise.resolve({ id: device.id }) },
    );
    expect(delRes.status).toBe(403);
    expect((await delRes.json()).error.code).toBe("forbidden");
  });
});
