import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { withTenant } from "./prisma-tenant";

/**
 * Default location for the safety-net JSON dumps written immediately before
 * `deleteOrganization` cascades. Override via `RACKSMITH_BACKUP_DIR` in
 * production to point at a persistent volume on the deployment host.
 */
const DEFAULT_BACKUP_DIR = "./backups";

function backupDir(): string {
  const raw = process.env.RACKSMITH_BACKUP_DIR?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_BACKUP_DIR;
}

export type OrganizationSnapshot = {
  exportedAt: string;
  schemaVersion: 1;
  organization: unknown;
  members: unknown[];
  invitations: unknown[];
  ownershipTransfers: unknown[];
  resources: {
    racks: unknown[];
    devices: unknown[];
    subnets: unknown[];
    ipAssignments: unknown[];
    dhcpRanges: unknown[];
    vlans: unknown[];
    vlanAssignments: unknown[];
    connections: unknown[];
    floorPlans: unknown[];
    discoveryScans: unknown[];
    buildPlans: unknown[];
    recommendationDismissals: unknown[];
    auditLogs: unknown[];
  };
};

/**
 * Build a full snapshot of the organization. The output is intentionally a
 * tree of plain Prisma rows — easy to re-import or hand-mine later. The
 * caller is responsible for writing it somewhere the user can recover it.
 */
export async function buildOrganizationSnapshot(
  organizationId: string,
): Promise<OrganizationSnapshot> {
  // All reads run inside a single `withTenant` transaction so the
  // tenant-scoped tables (Rack, Device, …, AuditLog) satisfy RLS. The
  // non-tenant tables (Organization, Member, Invitation, OwnershipTransfer)
  // aren't under RLS but are happy to share the transaction — one
  // consistent snapshot for the backup.
  const [
    organization,
    members,
    invitations,
    ownershipTransfers,
    racks,
    devices,
    subnets,
    ipAssignments,
    dhcpRanges,
    vlans,
    vlanAssignments,
    connections,
    floorPlans,
    discoveryScans,
    buildPlans,
    recommendationDismissals,
    auditLogs,
  ] = await withTenant(organizationId, (tx) =>
    Promise.all([
      tx.organization.findUnique({ where: { id: organizationId } }),
      tx.member.findMany({
        where: { organizationId },
        include: {
          user: {
            select: { id: true, name: true, email: true, createdAt: true },
          },
        },
      }),
      tx.invitation.findMany({ where: { organizationId } }),
      tx.ownershipTransfer.findMany({ where: { organizationId } }),
      tx.rack.findMany({ where: { organizationId } }),
      tx.device.findMany({ where: { organizationId } }),
      tx.subnet.findMany({ where: { organizationId } }),
      tx.ipAssignment.findMany({ where: { organizationId } }),
      tx.dhcpRange.findMany({ where: { organizationId } }),
      tx.vlan.findMany({ where: { organizationId } }),
      tx.vlanAssignment.findMany({ where: { organizationId } }),
      tx.connection.findMany({ where: { organizationId } }),
      tx.floorPlan.findMany({ where: { organizationId } }),
      tx.discoveryScan.findMany({ where: { organizationId } }),
      tx.buildPlan.findMany({ where: { organizationId } }),
      tx.recommendationDismissal.findMany({ where: { organizationId } }),
      tx.auditLog.findMany({ where: { organizationId } }),
    ]),
  );

  return {
    exportedAt: new Date().toISOString(),
    schemaVersion: 1,
    organization,
    members,
    invitations,
    ownershipTransfers,
    resources: {
      racks,
      devices,
      subnets,
      ipAssignments,
      dhcpRanges,
      vlans,
      vlanAssignments,
      connections,
      floorPlans,
      discoveryScans,
      buildPlans,
      recommendationDismissals,
      auditLogs,
    },
  };
}

/**
 * Write a snapshot to disk in the configured backup directory. Returns the
 * absolute path and the file size in bytes — caller is expected to audit
 * those for traceability.
 */
export async function writeOrganizationSnapshot(
  organizationId: string,
): Promise<{ path: string; bytes: number }> {
  const snapshot = await buildOrganizationSnapshot(organizationId);
  const json = JSON.stringify(snapshot, null, 2);
  const bytes = Buffer.byteLength(json, "utf8");

  const dir = path.resolve(backupDir());
  // mode 0o700 — snapshot contains every member email, audit entry, and
  // resource row for the org. Must not be world-readable even if the
  // parent permissions drift.
  await mkdir(dir, { recursive: true, mode: 0o700 });

  // ISO timestamp with `:` and `.` swapped out — keeps the filename safe on
  // Windows-style filesystems if anyone ever syncs the backup dir there.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(dir, `${organizationId}-${stamp}.json`);
  await writeFile(filePath, json, { encoding: "utf8", mode: 0o600 });

  return { path: filePath, bytes };
}
