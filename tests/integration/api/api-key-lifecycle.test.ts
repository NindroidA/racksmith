import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { revokeKeysCreatedByUser } from "@/lib/api/key-lifecycle";
import {
  seedOrgWithOwner,
  createTestApiKey,
  createTestUser,
  createTestMembership,
} from "../factories";

/**
 * Exercises the API-key revocation helper that `removeMember` calls inside
 * its atomic transaction. `removeMember` itself reads the Better Auth
 * session via `requireMember("admin")`, and the integration suite has no
 * session-stubbing path — so we test the extracted helper directly with
 * the same seeded state the action would see. The helper's behavior is
 * what matters; the transactional wrapping is exercised by unit review.
 */
describe("revokeKeysCreatedByUser (member-removal cascade)", () => {
  it("revokes keys created by the departing user", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { key } = await createTestApiKey(organization.id, user.id, {
      name: "departing-member-key",
    });

    const revokedIds = await prisma.$transaction((tx) =>
      revokeKeysCreatedByUser(tx, organization.id, user.id),
    );

    expect(revokedIds).toEqual([key.id]);
    const after = await prisma.apiKey.findUnique({ where: { id: key.id } });
    expect(after?.revokedAt).not.toBeNull();
  });

  it("leaves keys created by other users untouched", async () => {
    const { organization, user: owner } = await seedOrgWithOwner({
      plan: "pro",
    });
    // Seed a second user + membership in the same org so we have two
    // distinct creators to demonstrate the filter.
    const other = await createTestUser();
    await createTestMembership(other.id, organization.id, "admin");

    const { key: ownerKey } = await createTestApiKey(
      organization.id,
      owner.id,
      { name: "owner-key" },
    );
    const { key: otherKey } = await createTestApiKey(
      organization.id,
      other.id,
      { name: "other-key" },
    );

    // Revoke only the owner's keys.
    const revokedIds = await prisma.$transaction((tx) =>
      revokeKeysCreatedByUser(tx, organization.id, owner.id),
    );

    expect(revokedIds).toEqual([ownerKey.id]);
    const ownerAfter = await prisma.apiKey.findUnique({
      where: { id: ownerKey.id },
    });
    const otherAfter = await prisma.apiKey.findUnique({
      where: { id: otherKey.id },
    });
    expect(ownerAfter?.revokedAt).not.toBeNull();
    expect(otherAfter?.revokedAt).toBeNull();
  });

  it("skips keys that are already revoked (no double-revoke, stable revokedAt)", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });
    const { key: liveKey } = await createTestApiKey(organization.id, user.id, {
      name: "live-key",
    });
    const { key: preRevoked } = await createTestApiKey(
      organization.id,
      user.id,
      { name: "already-revoked", revoked: true },
    );
    const originalRevokedAt = preRevoked.revokedAt;

    const revokedIds = await prisma.$transaction((tx) =>
      revokeKeysCreatedByUser(tx, organization.id, user.id),
    );

    // Only the live key is in the return set — the pre-revoked one is
    // filtered out by the `revokedAt: null` predicate.
    expect(revokedIds).toEqual([liveKey.id]);
    const liveAfter = await prisma.apiKey.findUnique({
      where: { id: liveKey.id },
    });
    const preRevokedAfter = await prisma.apiKey.findUnique({
      where: { id: preRevoked.id },
    });
    expect(liveAfter?.revokedAt).not.toBeNull();
    // Original revokedAt is preserved — we don't touch keys that were
    // already revoked.
    expect(preRevokedAfter?.revokedAt?.getTime()).toBe(
      originalRevokedAt?.getTime(),
    );
  });

  it("does not revoke keys belonging to other organizations", async () => {
    const orgA = await seedOrgWithOwner({ plan: "pro", slug: "org-a" });
    const orgB = await seedOrgWithOwner({ plan: "pro", slug: "org-b" });
    // Same user identity doesn't exist across orgs, but a cross-tenant
    // matching createdByUserId + differing organizationId is the shape we
    // defend against — revocation must filter on both.
    const { key: keyInA } = await createTestApiKey(
      orgA.organization.id,
      orgA.user.id,
    );
    const { key: keyInB } = await createTestApiKey(
      orgB.organization.id,
      orgB.user.id,
    );

    // Ask to revoke orgA user's keys within orgA — orgB's keys should
    // not be affected even if a future bug dropped the organizationId
    // filter.
    const revokedIds = await prisma.$transaction((tx) =>
      revokeKeysCreatedByUser(tx, orgA.organization.id, orgA.user.id),
    );
    expect(revokedIds).toEqual([keyInA.id]);

    const aAfter = await prisma.apiKey.findUnique({
      where: { id: keyInA.id },
    });
    const bAfter = await prisma.apiKey.findUnique({
      where: { id: keyInB.id },
    });
    expect(aAfter?.revokedAt).not.toBeNull();
    expect(bAfter?.revokedAt).toBeNull();
  });

  it("returns empty array when the user created no keys", async () => {
    const { organization, user } = await seedOrgWithOwner({ plan: "pro" });

    const revokedIds = await prisma.$transaction((tx) =>
      revokeKeysCreatedByUser(tx, organization.id, user.id),
    );
    expect(revokedIds).toEqual([]);
  });
});
