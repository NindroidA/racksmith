import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/prisma-admin";
import { withTenant } from "@/lib/prisma-tenant";
import { generateApiKey } from "@/lib/api/api-key-crypto";
import type { Plan } from "@/lib/tiers";

/**
 * Test fixtures for the cross-tenant suite. Creates the full graph
 * (User → Member → Organization → Rack/Device/Subnet/etc.) so individual
 * tests can ask for "a populated org A and a populated org B" in one line.
 *
 * Everything goes through `withAdmin` to bypass RLS — we're constructing
 * the seed state, then letting the test exercise the production guards.
 */

export type TestContext = {
  user: { id: string; email: string };
  organization: { id: string; name: string; slug: string };
};

let counter = 0;
function nextId(prefix: string): string {
  counter++;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export async function createTestUser(opts?: { email?: string; name?: string }) {
  const id = nextId("user");
  const email = opts?.email ?? `${id}@test.local`;
  return withAdmin((tx) =>
    tx.user.create({
      data: {
        id,
        email,
        name: opts?.name ?? `Test ${id}`,
        emailVerified: true,
      },
    }),
  );
}

export async function createTestOrganization(opts?: {
  name?: string;
  slug?: string;
  plan?: Plan;
}) {
  const id = nextId("org");
  const slug = opts?.slug ?? id;
  return withAdmin((tx) =>
    tx.organization.create({
      data: {
        id,
        name: opts?.name ?? `Org ${id}`,
        slug,
        plan: opts?.plan ?? "business",
      },
    }),
  );
}

export async function createTestMembership(
  userId: string,
  organizationId: string,
  role: "owner" | "admin" | "member" | "viewer" = "owner",
) {
  return withAdmin((tx) =>
    tx.member.create({
      data: { userId, organizationId, role },
    }),
  );
}

/**
 * Seed an org with one owner, set as the user's active organization. Returns
 * the user + organization for convenience.
 */
export async function seedOrgWithOwner(opts?: {
  orgName?: string;
  userEmail?: string;
  plan?: Plan;
}): Promise<TestContext> {
  const user = await createTestUser({ email: opts?.userEmail });
  const organization = await createTestOrganization({
    name: opts?.orgName,
    plan: opts?.plan,
  });
  await createTestMembership(user.id, organization.id, "owner");
  await withAdmin((tx) =>
    tx.user.update({
      where: { id: user.id },
      data: { activeOrganizationId: organization.id },
    }),
  );
  return {
    user: { id: user.id, email: user.email },
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    },
  };
}

export async function createTestRack(
  organizationId: string,
  userId: string,
  opts?: { name?: string; sizeU?: number },
) {
  const id = nextId("rack");
  return withTenant(organizationId, (tx) =>
    tx.rack.create({
      data: {
        id,
        name: opts?.name ?? `Rack ${id}`,
        sizeU: opts?.sizeU ?? 42,
        userId,
        organizationId,
      },
    }),
  );
}

/**
 * Seed an ApiKey row for the rack/device/… integration suites. ApiKey is a
 * non-tenant table (RLS not FORCED — keys are looked up globally by hash
 * before org resolution), so `withAdmin` is the correct wrapper per the same
 * convention as `createTestUser` / `createTestOrganization`.
 *
 * Returns the persisted row plus the cleartext — callers pass the cleartext
 * as a Bearer token; the server re-hashes via `hashApiKey` and matches
 * against `ApiKey.hash`.
 */
export async function createTestApiKey(
  organizationId: string,
  createdByUserId: string,
  opts?: {
    role?: "member" | "admin";
    name?: string;
    revoked?: boolean;
    expiresAt?: Date | null;
  },
) {
  const { cleartext, hash, prefix } = generateApiKey();
  const key = await withAdmin((tx) =>
    tx.apiKey.create({
      data: {
        organizationId,
        createdByUserId,
        name: opts?.name ?? "test-key",
        role: opts?.role ?? "member",
        prefix,
        hash,
        revokedAt: opts?.revoked ? new Date() : null,
        expiresAt: opts?.expiresAt ?? null,
      },
    }),
  );
  return { key, cleartext };
}

export async function createTestDevice(
  organizationId: string,
  userId: string,
  opts?: { name?: string; rackId?: string | null },
) {
  const id = nextId("dev");
  return withTenant(organizationId, (tx) =>
    tx.device.create({
      data: {
        id,
        name: opts?.name ?? `Device ${id}`,
        deviceType: "switch",
        sizeU: 1,
        portCount: 24,
        rackId: opts?.rackId ?? null,
        userId,
        organizationId,
      },
    }),
  );
}

export async function createTestSubnet(
  organizationId: string,
  userId: string,
  opts?: { cidr?: string; name?: string },
) {
  const id = nextId("subnet");
  return withTenant(organizationId, (tx) =>
    tx.subnet.create({
      data: {
        id,
        cidr: opts?.cidr ?? "10.0.0.0/24",
        name: opts?.name ?? `Subnet ${id}`,
        userId,
        organizationId,
      },
    }),
  );
}

export async function createTestVlan(
  organizationId: string,
  userId: string,
  opts?: { vlanId?: number; name?: string },
) {
  const id = nextId("vlan");
  return withTenant(organizationId, (tx) =>
    tx.vlan.create({
      data: {
        id,
        vlanId: opts?.vlanId ?? 100,
        name: opts?.name ?? `Vlan ${id}`,
        userId,
        organizationId,
      },
    }),
  );
}

/**
 * Truncate every tenant-scoped table + the membership graph. Use sparingly
 * — the per-test setup already wipes between tests. This is only useful
 * if a test deliberately needs a totally clean slate mid-suite.
 */
export async function truncateAll() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AuditLog", "RecommendationDismissal", "BuildPlan",
      "DiscoveryScan", "FloorPlan", "Connection", "DhcpRange",
      "IpAssignment", "VlanAssignment", "Vlan", "Subnet",
      "Device", "Rack", "OwnershipTransfer", "Invitation",
      "Member", "Organization", "Session", "Account",
      "Verification", "TwoFactor", "UserSettings", "User"
    RESTART IDENTITY CASCADE
  `);
}
