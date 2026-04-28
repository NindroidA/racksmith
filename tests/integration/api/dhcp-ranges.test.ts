import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  GET as listGet,
  POST as listPost,
} from "@/app/api/v1/dhcp-ranges/route";
import {
  GET as idGet,
  PATCH as idPatch,
  DELETE as idDelete,
} from "@/app/api/v1/dhcp-ranges/[id]/route";
import {
  createTestApiKey,
  createTestSubnet,
  seedOrgWithOwner,
  truncateAll,
} from "../factories";

/**
 * End-to-end integration suite for /api/v1/dhcp-ranges. The DhcpRange
 * model has no unique constraint and no `createdAt` column, so this
 * suite is closer to "happy path + boundary checks" than the conflict-
 * heavy ip-assignments suite.
 */
describe("/api/v1/dhcp-ranges", () => {
  beforeEach(async () => {
    await truncateAll();
  });
  afterEach(async () => {
    await truncateAll();
  });

  it("creates, reads, updates, deletes a DHCP range end-to-end", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id, {
      role: "admin",
    });
    const auth = { Authorization: `Bearer ${cleartext}` };
    const subnet = await createTestSubnet(organization.id, user.id);

    const createRes = await listPost(
      new Request("http://x/api/v1/dhcp-ranges", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          subnetId: subnet.id,
          startIp: "10.0.0.100",
          endIp: "10.0.0.200",
          label: "DHCP pool",
        }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()).dhcpRange;
    expect(created.subnetId).toBe(subnet.id);
    expect(created.startIp).toBe("10.0.0.100");
    expect(created.endIp).toBe("10.0.0.200");
    expect(created.label).toBe("DHCP pool");

    const listRes = await listGet(
      new Request("http://x/api/v1/dhcp-ranges", { headers: auth }),
      { params: Promise.resolve({}) },
    );
    expect(listRes.status).toBe(200);
    expect((await listRes.json()).pagination.total).toBe(1);

    const getRes = await idGet(
      new Request(`http://x/api/v1/dhcp-ranges/${created.id}`, {
        headers: auth,
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(getRes.status).toBe(200);

    const patchRes = await idPatch(
      new Request(`http://x/api/v1/dhcp-ranges/${created.id}`, {
        method: "PATCH",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ label: "Static reservations" }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(patchRes.status).toBe(200);
    expect((await patchRes.json()).dhcpRange.label).toBe(
      "Static reservations",
    );

    const delRes = await idDelete(
      new Request(`http://x/api/v1/dhcp-ranges/${created.id}`, {
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
    const subnet = await createTestSubnet(organization.id, user.id);
    const res = await listPost(
      new Request("http://x/api/v1/dhcp-ranges", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleartext}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subnetId: subnet.id,
          startIp: "10.0.0.100",
          endIp: "10.0.0.200",
          organizationId: "OTHER",
        }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("validation_failed");
  });

  it("returns 404 when subnetId is unknown / cross-tenant", async () => {
    const a = await seedOrgWithOwner({ plan: "pro", orgName: "Org A" });
    const b = await seedOrgWithOwner({ plan: "pro", orgName: "Org B" });
    const subnetA = await createTestSubnet(a.organization.id, a.user.id);
    const { cleartext: bKey } = await createTestApiKey(
      b.organization.id,
      b.user.id,
    );
    const res = await listPost(
      new Request("http://x/api/v1/dhcp-ranges", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subnetId: subnetA.id,
          startIp: "10.0.0.100",
          endIp: "10.0.0.200",
        }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });

  it("filters list by subnetId query param", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const auth = { Authorization: `Bearer ${cleartext}` };
    const subnetA = await createTestSubnet(organization.id, user.id, {
      cidr: "10.0.0.0/24",
    });
    const subnetB = await createTestSubnet(organization.id, user.id, {
      cidr: "10.0.1.0/24",
    });

    await listPost(
      new Request("http://x/api/v1/dhcp-ranges", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          subnetId: subnetA.id,
          startIp: "10.0.0.100",
          endIp: "10.0.0.150",
        }),
      }),
      { params: Promise.resolve({}) },
    );
    await listPost(
      new Request("http://x/api/v1/dhcp-ranges", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          subnetId: subnetB.id,
          startIp: "10.0.1.100",
          endIp: "10.0.1.150",
        }),
      }),
      { params: Promise.resolve({}) },
    );

    const allRes = await listGet(
      new Request("http://x/api/v1/dhcp-ranges", { headers: auth }),
      { params: Promise.resolve({}) },
    );
    expect((await allRes.json()).pagination.total).toBe(2);

    const filteredRes = await listGet(
      new Request(`http://x/api/v1/dhcp-ranges?subnetId=${subnetA.id}`, {
        headers: auth,
      }),
      { params: Promise.resolve({}) },
    );
    expect((await filteredRes.json()).pagination.total).toBe(1);
  });

  it("member key cannot DELETE (403)", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id, {
      role: "member",
    });
    const auth = { Authorization: `Bearer ${cleartext}` };
    const subnet = await createTestSubnet(organization.id, user.id);
    const createRes = await listPost(
      new Request("http://x/api/v1/dhcp-ranges", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          subnetId: subnet.id,
          startIp: "10.0.0.50",
          endIp: "10.0.0.99",
        }),
      }),
      { params: Promise.resolve({}) },
    );
    const created = (await createRes.json()).dhcpRange;
    const res = await idDelete(
      new Request(`http://x/api/v1/dhcp-ranges/${created.id}`, {
        method: "DELETE",
        headers: auth,
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("forbidden");
  });

  it("free-tier key is rejected with 403 (apiAccess=false)", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "free" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const res = await listGet(
      new Request("http://x/api/v1/dhcp-ranges", {
        headers: { Authorization: `Bearer ${cleartext}` },
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("forbidden");
  });

  it("missing Authorization header returns 401", async () => {
    const res = await listGet(new Request("http://x/api/v1/dhcp-ranges"), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 for cross-tenant fetch (no info leak)", async () => {
    const a = await seedOrgWithOwner({ plan: "pro", orgName: "Org A" });
    const b = await seedOrgWithOwner({ plan: "pro", orgName: "Org B" });
    const subnetA = await createTestSubnet(a.organization.id, a.user.id);
    const { cleartext: aKey } = await createTestApiKey(
      a.organization.id,
      a.user.id,
    );
    const { cleartext: bKey } = await createTestApiKey(
      b.organization.id,
      b.user.id,
    );

    const createRes = await listPost(
      new Request("http://x/api/v1/dhcp-ranges", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subnetId: subnetA.id,
          startIp: "10.0.0.100",
          endIp: "10.0.0.150",
        }),
      }),
      { params: Promise.resolve({}) },
    );
    const aRange = (await createRes.json()).dhcpRange;

    const res = await idGet(
      new Request(`http://x/api/v1/dhcp-ranges/${aRange.id}`, {
        headers: { Authorization: `Bearer ${bKey}` },
      }),
      { params: Promise.resolve({ id: aRange.id }) },
    );
    expect(res.status).toBe(404);
  });
});
