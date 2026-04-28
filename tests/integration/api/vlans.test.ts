import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as listGet, POST as listPost } from "@/app/api/v1/vlans/route";
import {
  GET as idGet,
  PATCH as idPatch,
  DELETE as idDelete,
} from "@/app/api/v1/vlans/[id]/route";
import {
  createTestApiKey,
  createTestVlan,
  seedOrgWithOwner,
  truncateAll,
} from "../factories";

describe("/api/v1/vlans", () => {
  beforeEach(async () => {
    await truncateAll();
  });
  afterEach(async () => {
    await truncateAll();
  });

  it("creates, reads, updates, deletes a VLAN end-to-end", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id, {
      role: "admin",
    });
    const auth = { Authorization: `Bearer ${cleartext}` };

    // Create
    const createRes = await listPost(
      new Request("http://x/api/v1/vlans", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ vlanId: 100, name: "Mgmt" }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()).vlan;
    expect(created.vlanId).toBe(100);
    expect(created.name).toBe("Mgmt");
    expect(created.color).toBe("purple"); // default
    expect(created.purpose).toBe("user"); // default

    // List
    const listRes = await listGet(
      new Request("http://x/api/v1/vlans", { headers: auth }),
      { params: Promise.resolve({}) },
    );
    expect(listRes.status).toBe(200);
    expect((await listRes.json()).pagination.total).toBe(1);

    // Get one
    const getRes = await idGet(
      new Request(`http://x/api/v1/vlans/${created.id}`, { headers: auth }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(getRes.status).toBe(200);

    // Update
    const patchRes = await idPatch(
      new Request(`http://x/api/v1/vlans/${created.id}`, {
        method: "PATCH",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Management" }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(patchRes.status).toBe(200);
    expect((await patchRes.json()).vlan.name).toBe("Management");

    // Delete
    const delRes = await idDelete(
      new Request(`http://x/api/v1/vlans/${created.id}`, {
        method: "DELETE",
        headers: auth,
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(delRes.status).toBe(204);
  });

  it("returns 409 conflict on duplicate VLAN ID within the same org", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const auth = { Authorization: `Bearer ${cleartext}` };

    await listPost(
      new Request("http://x/api/v1/vlans", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ vlanId: 10, name: "Mgmt" }),
      }),
      { params: Promise.resolve({}) },
    );

    const dupRes = await listPost(
      new Request("http://x/api/v1/vlans", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ vlanId: 10, name: "Other" }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(dupRes.status).toBe(409);
    expect((await dupRes.json()).error.code).toBe("conflict");
  });

  it("rejects out-of-range vlanId (< 1 or > 4094)", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);

    for (const bad of [0, 4095, -1]) {
      const res = await listPost(
        new Request("http://x/api/v1/vlans", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${cleartext}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ vlanId: bad, name: "x" }),
        }),
        { params: Promise.resolve({}) },
      );
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("validation_failed");
    }
  });

  it("rejects names with control chars (newline / NUL)", async () => {
    // Names flow into Cisco/UniFi/HPE config-gen output; the validator
    // must mirror the dashboard's noControlChars regex.
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const res = await listPost(
      new Request("http://x/api/v1/vlans", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleartext}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ vlanId: 50, name: "ok\nname" }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("validation_failed");
  });

  it("filters list by purpose query param", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    await createTestVlan(organization.id, user.id, { vlanId: 10 });
    await createTestVlan(organization.id, user.id, { vlanId: 20 });

    // Test factory creates with the schema default `purpose: "user"`. Filter
    // by "guest" → 0 results.
    const res = await listGet(
      new Request("http://x/api/v1/vlans?purpose=guest", {
        headers: { Authorization: `Bearer ${cleartext}` },
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(200);
    expect((await res.json()).pagination.total).toBe(0);
  });

  it("member key cannot DELETE (403)", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id, {
      role: "member",
    });
    const vlan = await createTestVlan(organization.id, user.id);
    const res = await idDelete(
      new Request(`http://x/api/v1/vlans/${vlan.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${cleartext}` },
      }),
      { params: Promise.resolve({ id: vlan.id }) },
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("forbidden");
  });

  it("free-tier key is rejected with 403", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "free" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const res = await listGet(
      new Request("http://x/api/v1/vlans", {
        headers: { Authorization: `Bearer ${cleartext}` },
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(403);
  });

  it("missing Authorization header returns 401", async () => {
    const res = await listGet(new Request("http://x/api/v1/vlans"), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 for cross-tenant fetch", async () => {
    const a = await seedOrgWithOwner({ plan: "pro", orgName: "Org A" });
    const b = await seedOrgWithOwner({ plan: "pro", orgName: "Org B" });
    const vlanA = await createTestVlan(a.organization.id, a.user.id);
    const { cleartext: bKey } = await createTestApiKey(
      b.organization.id,
      b.user.id,
    );

    const res = await idGet(
      new Request(`http://x/api/v1/vlans/${vlanA.id}`, {
        headers: { Authorization: `Bearer ${bKey}` },
      }),
      { params: Promise.resolve({ id: vlanA.id }) },
    );
    expect(res.status).toBe(404);
  });
});
