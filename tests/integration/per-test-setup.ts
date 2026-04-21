import { beforeEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

/**
 * Wipe tenant-scoped data between tests so each `it` block sees a fresh
 * world. Order matters — child tables before parents to satisfy FK
 * constraints. Non-tenant tables (User, Member, Organization) are NOT
 * truncated by default; tests that need them clean use `truncateAll()`
 * from `./factories`.
 */
beforeEach(async () => {
  // Cascade trick: TRUNCATE ... CASCADE clears all dependent rows in one
  // statement. Faster than per-table delete loops.
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "AuditLog",
      "RecommendationDismissal",
      "BuildPlan",
      "DiscoveryScan",
      "FloorPlan",
      "Connection",
      "DhcpRange",
      "IpAssignment",
      "VlanAssignment",
      "Vlan",
      "Subnet",
      "Device",
      "Rack",
      "OwnershipTransfer",
      "Invitation",
      "Member",
      "Organization",
      "Session",
      "Account",
      "Verification",
      "TwoFactor",
      "UserSettings",
      "User"
    RESTART IDENTITY CASCADE
  `);
});

afterAll(async () => {
  await prisma.$disconnect();
});
