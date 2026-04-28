import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  GET as listGet,
  POST as listPost,
} from "@/app/api/v1/ip-assignments/route";
import {
  GET as idGet,
  PATCH as idPatch,
  DELETE as idDelete,
} from "@/app/api/v1/ip-assignments/[id]/route";
import {
  createTestApiKey,
  createTestSubnet,
  seedOrgWithOwner,
  truncateAll,
} from "../factories";

/**
 * End-to-end integration suite for /api/v1/ip-assignments. Phase-12 PR-B
 * extends the createApiRoute factory pattern to a nested-by-semantics
 * resource (IpAssignment lives under a Subnet conceptually but ships as
 * a top-level URL with `subnetId` as a body field + filter param). New
 * test coverage versus PR-A: cross-tenant subnetId returns precise 404
 * (not Prisma P2003), and `(subnetId, ipAddress)` unique constraint
 * surfaces as 409 conflict.
 */
describe("/api/v1/ip-assignments", () => {
  beforeEach(async () => {
    await truncateAll();
  });
  afterEach(async () => {
    await truncateAll();
  });

  it("creates, reads, updates, deletes an IP assignment end-to-end", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id, {
      role: "admin",
    });
    const auth = { Authorization: `Bearer ${cleartext}` };
    const subnet = await createTestSubnet(organization.id, user.id);

    // Create
    const createRes = await listPost(
      new Request("http://x/api/v1/ip-assignments", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          subnetId: subnet.id,
          ipAddress: "10.0.0.10",
          status: "reserved",
          notes: "router",
        }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()).ipAssignment;
    expect(created.subnetId).toBe(subnet.id);
    expect(created.ipAddress).toBe("10.0.0.10");
    expect(created.status).toBe("reserved");
    expect(created.deviceId).toBeNull();

    // List
    const listRes = await listGet(
      new Request("http://x/api/v1/ip-assignments", { headers: auth }),
      { params: Promise.resolve({}) },
    );
    expect(listRes.status).toBe(200);
    const listed = await listRes.json();
    expect(listed.ipAssignments.map((a: { id: string }) => a.id)).toContain(
      created.id,
    );
    expect(listed.pagination.total).toBe(1);

    // Get one
    const getRes = await idGet(
      new Request(`http://x/api/v1/ip-assignments/${created.id}`, {
        headers: auth,
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(getRes.status).toBe(200);

    // Update
    const patchRes = await idPatch(
      new Request(`http://x/api/v1/ip-assignments/${created.id}`, {
        method: "PATCH",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "assigned", notes: "core" }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(patchRes.status).toBe(200);
    const patched = (await patchRes.json()).ipAssignment;
    expect(patched.status).toBe("assigned");
    expect(patched.notes).toBe("core");

    // Delete
    const delRes = await idDelete(
      new Request(`http://x/api/v1/ip-assignments/${created.id}`, {
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
      new Request("http://x/api/v1/ip-assignments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleartext}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subnetId: subnet.id,
          ipAddress: "10.0.0.5",
          organizationId: "OTHER",
        }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("validation_failed");
  });

  it("returns 409 conflict on duplicate IP within the same subnet", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const auth = { Authorization: `Bearer ${cleartext}` };
    const subnet = await createTestSubnet(organization.id, user.id);

    await listPost(
      new Request("http://x/api/v1/ip-assignments", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ subnetId: subnet.id, ipAddress: "10.0.0.20" }),
      }),
      { params: Promise.resolve({}) },
    );

    const dupRes = await listPost(
      new Request("http://x/api/v1/ip-assignments", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ subnetId: subnet.id, ipAddress: "10.0.0.20" }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(dupRes.status).toBe(409);
    expect((await dupRes.json()).error.code).toBe("conflict");
  });

  it("returns 404 when subnetId is unknown / cross-tenant", async () => {
    // Org A creates a subnet; Org B's key tries to attach an assignment
    // to A's subnet — should look like the subnet doesn't exist.
    const a = await seedOrgWithOwner({ plan: "pro", orgName: "Org A" });
    const b = await seedOrgWithOwner({ plan: "pro", orgName: "Org B" });
    const subnetA = await createTestSubnet(a.organization.id, a.user.id);
    const { cleartext: bKey } = await createTestApiKey(
      b.organization.id,
      b.user.id,
    );
    const res = await listPost(
      new Request("http://x/api/v1/ip-assignments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subnetId: subnetA.id,
          ipAddress: "10.0.0.42",
        }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });

  it("filters list by subnetId and status query params", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const auth = { Authorization: `Bearer ${cleartext}` };
    const subnetA = await createTestSubnet(organization.id, user.id, {
      cidr: "10.0.0.0/24",
    });
    const subnetB = await createTestSubnet(organization.id, user.id, {
      cidr: "10.0.1.0/24",
    });

    // 2 in subnetA, 1 in subnetB; one of the A's is "reserved", rest "assigned"
    await listPost(
      new Request("http://x/api/v1/ip-assignments", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          subnetId: subnetA.id,
          ipAddress: "10.0.0.1",
          status: "reserved",
        }),
      }),
      { params: Promise.resolve({}) },
    );
    await listPost(
      new Request("http://x/api/v1/ip-assignments", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ subnetId: subnetA.id, ipAddress: "10.0.0.2" }),
      }),
      { params: Promise.resolve({}) },
    );
    await listPost(
      new Request("http://x/api/v1/ip-assignments", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ subnetId: subnetB.id, ipAddress: "10.0.1.1" }),
      }),
      { params: Promise.resolve({}) },
    );

    const allRes = await listGet(
      new Request("http://x/api/v1/ip-assignments", { headers: auth }),
      { params: Promise.resolve({}) },
    );
    expect((await allRes.json()).pagination.total).toBe(3);

    const subnetARes = await listGet(
      new Request(`http://x/api/v1/ip-assignments?subnetId=${subnetA.id}`, {
        headers: auth,
      }),
      { params: Promise.resolve({}) },
    );
    expect((await subnetARes.json()).pagination.total).toBe(2);

    const reservedRes = await listGet(
      new Request("http://x/api/v1/ip-assignments?status=reserved", {
        headers: auth,
      }),
      { params: Promise.resolve({}) },
    );
    expect((await reservedRes.json()).pagination.total).toBe(1);
  });

  it("member key cannot DELETE (403)", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id, {
      role: "member",
    });
    const auth = { Authorization: `Bearer ${cleartext}` };
    const subnet = await createTestSubnet(organization.id, user.id);
    const createRes = await listPost(
      new Request("http://x/api/v1/ip-assignments", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ subnetId: subnet.id, ipAddress: "10.0.0.99" }),
      }),
      { params: Promise.resolve({}) },
    );
    const created = (await createRes.json()).ipAssignment;
    const res = await idDelete(
      new Request(`http://x/api/v1/ip-assignments/${created.id}`, {
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
      new Request("http://x/api/v1/ip-assignments", {
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
      new Request("http://x/api/v1/ip-assignments", {
        headers: { Authorization: `Bearer ${cleartext}` },
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("unauthorized");
  });

  it("missing Authorization header returns 401", async () => {
    const res = await listGet(new Request("http://x/api/v1/ip-assignments"), {
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
      new Request("http://x/api/v1/ip-assignments", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subnetId: subnetA.id,
          ipAddress: "10.0.0.50",
        }),
      }),
      { params: Promise.resolve({}) },
    );
    const aAssignment = (await createRes.json()).ipAssignment;

    const res = await idGet(
      new Request(`http://x/api/v1/ip-assignments/${aAssignment.id}`, {
        headers: { Authorization: `Bearer ${bKey}` },
      }),
      { params: Promise.resolve({ id: aAssignment.id }) },
    );
    expect(res.status).toBe(404);
  });
});
