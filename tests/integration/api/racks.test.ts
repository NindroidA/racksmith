import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GET as listGet, POST as listPost } from "@/app/api/v1/racks/route";
import {
  GET as idGet,
  PATCH as idPatch,
  DELETE as idDelete,
} from "@/app/api/v1/racks/[id]/route";
import {
  createTestApiKey,
  createTestRack,
  seedOrgWithOwner,
  truncateAll,
} from "../factories";

/**
 * End-to-end integration suite for the /api/v1/racks endpoints landed in E2
 * (list + create) and E3 (per-resource get / patch / delete). Each case
 * drives the real route handlers against the test Postgres + RLS-enforced
 * app role — the same surface a Bearer-authed HTTP client would hit.
 *
 * Coverage rationale:
 *  1. Happy-path CRUD round-trip pins the serialization + pagination
 *     contract end-to-end.
 *  2. Mass-assignment rejection locks zod's .strict() guard on the create
 *     body schema.
 *  3. Member key → DELETE returns 403 — pins the admin-role requirement on
 *     the per-resource DELETE route.
 *  4. Free-tier key returns 403 — pins the apiAccess tier gate in
 *     requireApiKey (triggers the plan check before rate-limiting).
 *  5. Revoked key returns 401 — pins the revokedAt short-circuit.
 *  6. Missing Authorization header returns 401 — pins the header-absent
 *     early return.
 */
describe("/api/v1/racks", () => {
  beforeEach(async () => {
    await truncateAll();
  });
  afterEach(async () => {
    await truncateAll();
  });

  it("creates, reads, updates, deletes a rack end-to-end", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id, {
      role: "admin",
    });
    const auth = { Authorization: `Bearer ${cleartext}` };

    // Create
    const createRes = await listPost(
      new Request("http://x/api/v1/racks", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Row A", sizeU: 42 }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(createRes.status).toBe(201);
    const created = (await createRes.json()).rack;
    expect(created.name).toBe("Row A");
    expect(created.sizeU).toBe(42);

    // List
    const listRes = await listGet(
      new Request("http://x/api/v1/racks", { headers: auth }),
      { params: Promise.resolve({}) },
    );
    expect(listRes.status).toBe(200);
    const listed = await listRes.json();
    expect(listed.racks.map((r: { id: string }) => r.id)).toContain(created.id);
    expect(listed.pagination.total).toBe(1);

    // Get one
    const getRes = await idGet(
      new Request(`http://x/api/v1/racks/${created.id}`, { headers: auth }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(getRes.status).toBe(200);

    // Update
    const patchRes = await idPatch(
      new Request(`http://x/api/v1/racks/${created.id}`, {
        method: "PATCH",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Row A (renamed)" }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(patchRes.status).toBe(200);
    expect((await patchRes.json()).rack.name).toBe("Row A (renamed)");

    // Delete
    const delRes = await idDelete(
      new Request(`http://x/api/v1/racks/${created.id}`, {
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
      new Request("http://x/api/v1/racks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cleartext}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "x", sizeU: 10, organizationId: "OTHER" }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("validation_failed");
  });

  it("member key cannot DELETE (403)", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { cleartext } = await createTestApiKey(organization.id, user.id, {
      role: "member",
    });
    const rack = await createTestRack(organization.id, user.id);
    const res = await idDelete(
      new Request(`http://x/api/v1/racks/${rack.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${cleartext}` },
      }),
      { params: Promise.resolve({ id: rack.id }) },
    );
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("forbidden");
  });

  it("free-tier key is rejected with 403 forbidden (apiAccess=false)", async () => {
    // Free can't create keys via UI (apiKeyMax=0), but if a key already
    // exists (e.g. org downgraded from Pro), requireApiKey's tier check
    // returns 403 forbidden.
    const { organization, user } = await seedOrgWithOwner({ plan: "free" });
    const { cleartext } = await createTestApiKey(organization.id, user.id);
    const res = await listGet(
      new Request("http://x/api/v1/racks", {
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
      new Request("http://x/api/v1/racks", {
        headers: { Authorization: `Bearer ${cleartext}` },
      }),
      { params: Promise.resolve({}) },
    );
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("unauthorized");
  });

  it("missing Authorization header returns 401", async () => {
    const res = await listGet(new Request("http://x/api/v1/racks"), {
      params: Promise.resolve({}),
    });
    expect(res.status).toBe(401);
  });
});
