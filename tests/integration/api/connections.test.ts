import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  GET as listGet,
  POST as listPost,
} from "@/app/api/v1/connections/route";
import {
  GET as idGet,
  PATCH as idPatch,
  DELETE as idDelete,
} from "@/app/api/v1/connections/[id]/route";
import {
  createTestApiKey,
  createTestDevice,
  createTestRack,
  seedOrgWithOwner,
  truncateAll,
} from "../factories";

/**
 * End-to-end integration suite for /api/v1/connections — Phase 12 PR-C,
 * the closing surface of the v1 REST API expansion. New coverage versus
 * earlier IPAM PRs:
 *
 *   - Self-loop rejection at the schema layer (sourceDeviceId !==
 *     targetDeviceId) — verified for both POST and PATCH-into-loop.
 *   - Member-rank DELETE carve-out — connections are non-destructive
 *     topology metadata, so member keys CAN delete (opposite of the
 *     racks/devices/subnets/vlans/ipam rule).
 *   - Two-side device existence check via a single `count({ id: in })`
 *     so a cross-tenant or unknown deviceId returns precise 404.
 */
describe("/api/v1/connections", () => {
  beforeEach(async () => {
    await truncateAll();
  });
  afterEach(async () => {
    await truncateAll();
  });

  it("creates, reads, updates, deletes a connection end-to-end", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const auth = { Authorization: `Bearer ${cleartext}` };
    const rack = await createTestRack(organization.id, user.id);
    const a = await createTestDevice(organization.id, user.id, {
      rackId: rack.id,
    });
    const b = await createTestDevice(organization.id, user.id, {
      rackId: rack.id,
    });

    const createRes = await listPost(
      new Request("http://x/api/v1/connections", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceDeviceId: a.id,
          targetDeviceId: b.id,
          sourcePort: "Gi1/0/1",
          targetPort: "Eth1",
          cableType: "fiber",
        }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()).connection;
    expect(created.sourceDeviceId).toBe(a.id);
    expect(created.targetDeviceId).toBe(b.id);
    expect(created.cableType).toBe("fiber");
    expect(created.cableLengthFt).toBeNull();

    const listRes = await listGet(
      new Request("http://x/api/v1/connections", { headers: auth }),
      { params: Promise.resolve({}) },
    );
    expect(listRes.status).toBe(200);
    expect((await listRes.json()).pagination.total).toBe(1);

    const getRes = await idGet(
      new Request(`http://x/api/v1/connections/${created.id}`, {
        headers: auth,
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(getRes.status).toBe(200);

    const patchRes = await idPatch(
      new Request(`http://x/api/v1/connections/${created.id}`, {
        method: "PATCH",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ cableLengthFt: 25, description: "core uplink" }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(patchRes.status).toBe(200);
    const patched = (await patchRes.json()).connection;
    expect(patched.cableLengthFt).toBe(25);
    expect(patched.description).toBe("core uplink");

    // Member key CAN delete connections (carve-out from admin convention)
    const delRes = await idDelete(
      new Request(`http://x/api/v1/connections/${created.id}`, {
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
    const a = await createTestDevice(organization.id, user.id);
    const b = await createTestDevice(organization.id, user.id);
    const res = await listPost(
      new Request("http://x/api/v1/connections", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleartext}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceDeviceId: a.id,
          targetDeviceId: b.id,
          organizationId: "OTHER",
        }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("validation_failed");
  });

  it("rejects self-loop on POST (sourceDeviceId === targetDeviceId)", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const a = await createTestDevice(organization.id, user.id);
    const res = await listPost(
      new Request("http://x/api/v1/connections", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleartext}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceDeviceId: a.id,
          targetDeviceId: a.id,
        }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("validation_failed");
  });

  it("allows atomic endpoint swap (PATCH both sides at once with values that overlap existing)", async () => {
    // Existing (A, B). Body swaps to (B, A). The schema's .refine()
    // proves B !== A; post-update is (B, A), non-loop. A naive
    // single-pass row guard like "targetDeviceId != body.sourceDeviceId"
    // would falsely reject this because existing target IS B.
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const auth = { Authorization: `Bearer ${cleartext}` };
    const a = await createTestDevice(organization.id, user.id);
    const b = await createTestDevice(organization.id, user.id);

    const createRes = await listPost(
      new Request("http://x/api/v1/connections", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ sourceDeviceId: a.id, targetDeviceId: b.id }),
      }),
      { params: Promise.resolve({}) },
    );
    const created = (await createRes.json()).connection;

    const swapRes = await idPatch(
      new Request(`http://x/api/v1/connections/${created.id}`, {
        method: "PATCH",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ sourceDeviceId: b.id, targetDeviceId: a.id }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(swapRes.status).toBe(200);
    const swapped = (await swapRes.json()).connection;
    expect(swapped.sourceDeviceId).toBe(b.id);
    expect(swapped.targetDeviceId).toBe(a.id);
  });

  it("rejects PATCH that would create a self-loop relative to existing row", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const auth = { Authorization: `Bearer ${cleartext}` };
    const a = await createTestDevice(organization.id, user.id);
    const b = await createTestDevice(organization.id, user.id);

    const createRes = await listPost(
      new Request("http://x/api/v1/connections", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ sourceDeviceId: a.id, targetDeviceId: b.id }),
      }),
      { params: Promise.resolve({}) },
    );
    const created = (await createRes.json()).connection;

    // PATCH targetDeviceId to match the unchanged sourceDeviceId — schema
    // refine doesn't catch this (only one side present), but the route
    // handler's post-merge check does.
    const res = await idPatch(
      new Request(`http://x/api/v1/connections/${created.id}`, {
        method: "PATCH",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ targetDeviceId: a.id }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("validation_failed");
  });

  it("returns 404 when sourceDeviceId is unknown / cross-tenant", async () => {
    const a = await seedOrgWithOwner({ plan: "pro", orgName: "Org A" });
    const b = await seedOrgWithOwner({ plan: "pro", orgName: "Org B" });
    const deviceA = await createTestDevice(a.organization.id, a.user.id);
    const deviceB = await createTestDevice(b.organization.id, b.user.id);
    const { cleartext: bKey } = await createTestApiKey(
      b.organization.id,
      b.user.id,
    );

    // Org B's key tries to wire B's own device to org A's device — the
    // cross-tenant deviceId should look like it doesn't exist.
    const res = await listPost(
      new Request("http://x/api/v1/connections", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceDeviceId: deviceB.id,
          targetDeviceId: deviceA.id,
        }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("not_found");
  });

  it("filters list by sourceDeviceId, targetDeviceId, cableType", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const auth = { Authorization: `Bearer ${cleartext}` };
    const a = await createTestDevice(organization.id, user.id);
    const b = await createTestDevice(organization.id, user.id);
    const c = await createTestDevice(organization.id, user.id);

    // a→b (ethernet), a→c (fiber), b→c (ethernet)
    await listPost(
      new Request("http://x/api/v1/connections", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceDeviceId: a.id,
          targetDeviceId: b.id,
          cableType: "ethernet",
        }),
      }),
      { params: Promise.resolve({}) },
    );
    await listPost(
      new Request("http://x/api/v1/connections", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceDeviceId: a.id,
          targetDeviceId: c.id,
          cableType: "fiber",
        }),
      }),
      { params: Promise.resolve({}) },
    );
    await listPost(
      new Request("http://x/api/v1/connections", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceDeviceId: b.id,
          targetDeviceId: c.id,
          cableType: "ethernet",
        }),
      }),
      { params: Promise.resolve({}) },
    );

    const allRes = await listGet(
      new Request("http://x/api/v1/connections", { headers: auth }),
      { params: Promise.resolve({}) },
    );
    expect((await allRes.json()).pagination.total).toBe(3);

    const fromARes = await listGet(
      new Request(`http://x/api/v1/connections?sourceDeviceId=${a.id}`, {
        headers: auth,
      }),
      { params: Promise.resolve({}) },
    );
    expect((await fromARes.json()).pagination.total).toBe(2);

    const fiberRes = await listGet(
      new Request("http://x/api/v1/connections?cableType=fiber", {
        headers: auth,
      }),
      { params: Promise.resolve({}) },
    );
    expect((await fiberRes.json()).pagination.total).toBe(1);

    const toCRes = await listGet(
      new Request(`http://x/api/v1/connections?targetDeviceId=${c.id}`, {
        headers: auth,
      }),
      { params: Promise.resolve({}) },
    );
    expect((await toCRes.json()).pagination.total).toBe(2);
  });

  it("free-tier key is rejected with 403 (apiAccess=false)", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "free" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const res = await listGet(
      new Request("http://x/api/v1/connections", {
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
      new Request("http://x/api/v1/connections", {
        headers: { Authorization: `Bearer ${cleartext}` },
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("unauthorized");
  });

  it("missing Authorization header returns 401", async () => {
    const res = await listGet(new Request("http://x/api/v1/connections"), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 for cross-tenant fetch (no info leak)", async () => {
    const a = await seedOrgWithOwner({ plan: "pro", orgName: "Org A" });
    const b = await seedOrgWithOwner({ plan: "pro", orgName: "Org B" });
    const a1 = await createTestDevice(a.organization.id, a.user.id);
    const a2 = await createTestDevice(a.organization.id, a.user.id);
    const { cleartext: aKey } = await createTestApiKey(
      a.organization.id,
      a.user.id,
    );
    const { cleartext: bKey } = await createTestApiKey(
      b.organization.id,
      b.user.id,
    );

    // Org A creates a connection between A's two devices
    const createRes = await listPost(
      new Request("http://x/api/v1/connections", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourceDeviceId: a1.id,
          targetDeviceId: a2.id,
        }),
      }),
      { params: Promise.resolve({}) },
    );
    const aConnection = (await createRes.json()).connection;

    const res = await idGet(
      new Request(`http://x/api/v1/connections/${aConnection.id}`, {
        headers: { Authorization: `Bearer ${bKey}` },
      }),
      { params: Promise.resolve({ id: aConnection.id }) },
    );
    expect(res.status).toBe(404);
  });
});
