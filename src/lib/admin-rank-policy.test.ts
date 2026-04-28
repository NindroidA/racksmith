import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Verifies the destructive-operation rank policy: every dashboard `delete*`
 * server action on tenant data calls `requireMember("admin")` rather than
 * `requireMember("member")`. The two carve-outs are `removeDeviceFromRack`
 * (un-rack ≠ delete) and `deleteConnection` (non-destructive metadata).
 *
 * We exercise the policy by mocking the auth boundary to return a
 * member-rank user and asserting that the bumped verbs short-circuit at
 * `requireMember` with a Forbidden error mentioning "admin or higher". The
 * carve-out verbs are exercised with the same mock: they should *not* fail
 * with a Forbidden error (they pass the rank gate; further mocks make the
 * action return a non-Forbidden error so we don't need a real DB).
 *
 * Hoisted vi.mock() calls run before any import, so the mocked modules
 * intercept the action files' imports of `next/headers`, `next/navigation`,
 * `@/lib/auth`, `@/lib/prisma`, etc.
 */

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((dest: string) => {
    const e = new Error(`__redirect__:${dest}`);
    (e as Error & { __redirect: string }).__redirect = dest;
    throw e;
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    member: { findUnique: vi.fn() },
    device: { findFirst: vi.fn() },
  },
}));

// Sentinel: thrown from withTenant whenever a carve-out test reaches the
// data layer. Lets us assert "the rank gate passed" without needing a real
// DB to short-circuit on a not-found row.
const SENTINEL = new Error("__withTenant_reached__");

vi.mock("@/lib/prisma-tenant", () => ({
  withTenant: vi.fn(async () => {
    throw SENTINEL;
  }),
}));

vi.mock("@/lib/audit", () => ({
  audit: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteRack, removeDeviceFromRack } from "@/app/(dashboard)/racks/actions";
import { deleteDevice } from "@/app/(dashboard)/devices/actions";
import {
  deleteSubnet,
  deleteDhcpRange,
  deleteIpAssignment,
} from "@/app/(dashboard)/ipam/actions";
import {
  deleteVlan,
  removeVlanAssignment,
} from "@/app/(dashboard)/network-tools/vlans/actions";
import { deleteConnection } from "@/app/(dashboard)/topology/actions";

beforeEach(() => {
  vi.clearAllMocks();
  // Default mock state: a real session with an active org, member-rank
  // membership. Each test can override member.role to test other ranks.
  vi.mocked(auth.api.getSession).mockResolvedValue({
    user: { id: "user_1" },
  } as never);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    activeOrganizationId: "org_1",
  } as never);
  vi.mocked(prisma.member.findUnique).mockResolvedValue({
    role: "member",
  } as never);
});

const VALID_CUID = "cmoc7jpxl000n6dtbamrx2lug"; // shape-valid; never resolved

describe("destructive verbs require admin rank", () => {
  // Each verb is one row of the table; the pattern is identical so a
  // table-driven test keeps the file short. The action gets called with a
  // valid-CUID id; requireMember fires before any data layer access.
  it.each([
    ["deleteRack", () => deleteRack(VALID_CUID)],
    ["deleteDevice", () => deleteDevice(VALID_CUID)],
    ["deleteSubnet", () => deleteSubnet(VALID_CUID)],
    ["deleteDhcpRange", () => deleteDhcpRange(VALID_CUID)],
    ["deleteIpAssignment", () => deleteIpAssignment(VALID_CUID)],
    ["deleteVlan", () => deleteVlan(VALID_CUID)],
    ["removeVlanAssignment", () => removeVlanAssignment(VALID_CUID)],
  ])("%s rejects member-rank caller with admin-required error", async (_, run) => {
    const result = await run();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/admin or higher/);
    }
  });

  it.each([
    ["deleteRack", () => deleteRack(VALID_CUID)],
    ["deleteDevice", () => deleteDevice(VALID_CUID)],
    ["deleteSubnet", () => deleteSubnet(VALID_CUID)],
    ["deleteDhcpRange", () => deleteDhcpRange(VALID_CUID)],
    ["deleteIpAssignment", () => deleteIpAssignment(VALID_CUID)],
    ["deleteVlan", () => deleteVlan(VALID_CUID)],
    ["removeVlanAssignment", () => removeVlanAssignment(VALID_CUID)],
  ])("%s succeeds the rank gate for admin-rank caller", async (_, run) => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue({
      role: "admin",
    } as never);
    const result = await run();
    // Rank gate passed → withTenant ran → SENTINEL was thrown → envelope
    // collapsed to ok:false with the sentinel message. The point is we did
    // NOT get short-circuited at requireMember.
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toMatch(/admin or higher/);
    }
  });
});

describe("carve-outs stay at member rank", () => {
  // These two verbs are intentionally NOT bumped to admin: removeDeviceFromRack
  // is the reciprocal of place* (members do that), and deleteConnection is
  // non-destructive topology metadata.
  it.each([
    ["removeDeviceFromRack", () => removeDeviceFromRack(VALID_CUID)],
    ["deleteConnection", () => deleteConnection(VALID_CUID)],
  ])("%s does not block member-rank caller", async (_, run) => {
    const result = await run();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).not.toMatch(/admin or higher/);
    }
  });
});
