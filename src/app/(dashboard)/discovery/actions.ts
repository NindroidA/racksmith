"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth-helpers";
import { withTenant } from "@/lib/prisma-tenant";
import { audit } from "@/lib/audit";
import { canCreateDeviceLocked } from "@/lib/tiers";
import { withActionEnvelope } from "@/lib/action-helpers";
import type { ActionResult } from "@/lib/action-types";
import type { DiscoveredHost } from "@/lib/discovery/nmap";

type HostEntry = DiscoveredHost & {
  match:
    | { kind: "known"; deviceId: string; deviceName: string }
    | { kind: "new" };
  typeGuess: string;
  actionState: "pending" | "approved" | "assigned" | "ignored";
};

type ScanResults = { hosts: HostEntry[] };

/**
 * Update a scan's host action state (loads results, mutates the specific
 * host, writes back). Returns `ActionResult` because the UI-exposed caller
 * `ignoreDiscovery` surfaces the result directly; the post-write callers
 * (`approveDiscovery`, `assignToExistingDevice`) already committed their
 * primary write and pass the result through `logScanStateFailure` instead
 * of reporting it to the user — the scan-state annotation is advisory.
 */
async function updateHostState(
  scanId: string,
  organizationId: string,
  ip: string,
  patch: Partial<HostEntry>,
): Promise<ActionResult> {
  return withTenant(organizationId, async (tx) => {
    const scan = await tx.discoveryScan.findFirst({
      where: { id: scanId, organizationId },
      select: { results: true },
    });
    if (!scan) return { ok: false, error: "Scan not found" };
    const results = scan.results as ScanResults | null;
    if (!results?.hosts) return { ok: false, error: "Scan has no results" };

    const idx = results.hosts.findIndex((h) => h.ip === ip);
    if (idx === -1) return { ok: false, error: "Host not in scan results" };

    results.hosts[idx] = { ...results.hosts[idx], ...patch };

    await tx.discoveryScan.update({
      where: { id: scanId },
      data: { results },
    });
    return { ok: true, data: undefined };
  });
}

function logScanStateFailure(
  context: string,
  scanId: string,
  ip: string,
  result: ActionResult,
) {
  if (result.ok) return;
  console.warn("[discovery] post-write host-state update failed", {
    context,
    scanId,
    ip,
    error: result.error,
  });
}

export async function approveDiscovery(
  scanId: string,
  hostIp: string,
  overrides?: { name?: string },
): Promise<ActionResult<{ deviceId: string }>> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const scan = await withTenant(organizationId, (tx) =>
      tx.discoveryScan.findFirst({
        where: { id: scanId, organizationId },
        select: { results: true },
      }),
    );
    if (!scan) return { ok: false, error: "Scan not found" };
    const results = scan.results as ScanResults | null;
    const host = results?.hosts.find((h) => h.ip === hostIp);
    if (!host) return { ok: false, error: "Host not found" };

    const deviceName =
      overrides?.name ?? host.hostname ?? `discovered-${host.ip}`;

    // Tier guard — approving a discovered host creates a new Device, so
    // must respect the org's device cap. Ran inside the tx with an advisory
    // lock so two concurrent approvals serialize against the same counter.
    const createResult = await withTenant(organizationId, async (tx) => {
      const check = await canCreateDeviceLocked(tx, organizationId);
      if (!check.ok) {
        return { kind: "denied" as const, error: check.reason };
      }
      const device = await tx.device.create({
        data: {
          userId: session.user.id,
          organizationId,
          name: deviceName,
          deviceType: host.typeGuess || "other",
          manufacturer: host.vendor?.toLowerCase() || "",
          model: "",
          sizeU: 1,
          portCount: 0,
          ipAddress: host.ip,
          macAddress: host.mac,
          hostname: host.hostname,
          osFingerprint: host.osGuess,
          isManual: false,
          discoveredAt: new Date(),
          lastSeen: new Date(),
        },
        select: { id: true },
      });
      return { kind: "ok" as const, id: device.id };
    });

    if (createResult.kind === "denied") {
      return { ok: false, error: createResult.error };
    }
    const deviceId = createResult.id;

    const stateResult = await updateHostState(scanId, organizationId, hostIp, {
      actionState: "approved",
      match: { kind: "known", deviceId, deviceName },
    });
    logScanStateFailure("approveDiscovery", scanId, hostIp, stateResult);

    await audit({
      userId: session.user.id,
      organizationId,
      action: "device_discovered",
      entityType: "device",
      entityId: deviceId,
      changes: { name: deviceName, ip: host.ip, mac: host.mac },
      metadata: { scanId },
    });

    revalidatePath("/discovery");
    revalidatePath("/devices");
    revalidatePath("/dashboard");
    return { ok: true, data: { deviceId } };
  }, "Failed to create device");
}

export async function assignToExistingDevice(
  scanId: string,
  hostIp: string,
  deviceId: string,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const preload = await withTenant(organizationId, async (tx) => {
      const scan = await tx.discoveryScan.findFirst({
        where: { id: scanId, organizationId },
        select: { results: true },
      });
      const device = await tx.device.findFirst({
        where: { id: deviceId, organizationId },
      });
      return { scan, device };
    });
    const { scan, device } = preload;
    if (!scan) return { ok: false, error: "Scan not found" };
    const results = scan.results as ScanResults | null;
    const host = results?.hosts.find((h) => h.ip === hostIp);
    if (!host) return { ok: false, error: "Host not found" };

    if (!device) return { ok: false, error: "Device not found" };

    await withTenant(organizationId, (tx) =>
      tx.device.update({
        where: { id: deviceId },
        data: {
          ipAddress: host.ip,
          ...(host.mac ? { macAddress: host.mac } : {}),
          ...(host.hostname ? { hostname: host.hostname } : {}),
          ...(host.osGuess ? { osFingerprint: host.osGuess } : {}),
          lastSeen: new Date(),
        },
      }),
    );

    const stateResult = await updateHostState(scanId, organizationId, hostIp, {
      actionState: "assigned",
      match: { kind: "known", deviceId, deviceName: device.name },
    });
    logScanStateFailure("assignToExistingDevice", scanId, hostIp, stateResult);

    await audit({
      userId: session.user.id,
      organizationId,
      action: "updated",
      entityType: "device",
      entityId: deviceId,
      changes: {
        ip: host.ip,
        ...(host.mac ? { mac: host.mac } : {}),
        ...(host.hostname ? { hostname: host.hostname } : {}),
      },
      metadata: { linkedFromScan: scanId, hostIp },
    });

    revalidatePath("/discovery");
    revalidatePath("/devices");
    revalidatePath(`/devices/${deviceId}`);
    return { ok: true, data: undefined };
  }, "Failed to assign to existing device");
}

export async function ignoreDiscovery(
  scanId: string,
  hostIp: string,
): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { organizationId } = await requireMember("member");
    const r = await updateHostState(scanId, organizationId, hostIp, {
      actionState: "ignored",
    });
    revalidatePath("/discovery");
    return r;
  }, "Failed to ignore host");
}

export async function cancelScan(scanId: string): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    const { session, organizationId } = await requireMember("member");

    const result = await withTenant(organizationId, (tx) =>
      tx.discoveryScan.updateMany({
        where: {
          id: scanId,
          organizationId,
          status: { in: ["pending", "running"] },
        },
        data: {
          status: "cancelled",
          error: "Cancelled by user",
          completedAt: new Date(),
        },
      }),
    );
    if (result.count === 0) {
      return { ok: false, error: "Scan not found or already complete" };
    }
    await audit({
      userId: session.user.id,
      organizationId,
      action: "scan_cancelled",
      entityType: "discovery_scan",
      entityId: scanId,
    });
    revalidatePath("/discovery");
    return { ok: true, data: undefined };
  }, "Failed to cancel");
}

export async function deleteScan(scanId: string): Promise<ActionResult> {
  return withActionEnvelope(async () => {
    // Destructive delete of a tenant-scoped row → admin rank (CLAUDE.md
    // destructive-operation policy; DiscoveryScan is not a carve-out).
    const { session, organizationId } = await requireMember("admin");
    const result = await withTenant(organizationId, (tx) =>
      tx.discoveryScan.deleteMany({
        where: { id: scanId, organizationId },
      }),
    );
    if (result.count === 0) {
      return { ok: false, error: "Scan not found" };
    }
    await audit({
      userId: session.user.id,
      organizationId,
      action: "deleted",
      entityType: "discovery_scan",
      entityId: scanId,
    });
    revalidatePath("/discovery");
    return { ok: true, data: undefined };
  }, "Failed to delete");
}
