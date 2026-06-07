import "server-only";

import { audit } from "@/lib/audit";
import { describeError } from "@/lib/error-message";
import { withTenant } from "@/lib/prisma-tenant";
import { guessDeviceType, matchHost } from "./matcher";
import type { NmapScanOutcome } from "./nmap";

type CompleteScanArgs = {
  scanId: string;
  organizationId: string;
  userId: string;
  subnet: string;
  result: NmapScanOutcome;
};

/**
 * Apply the post-nmap callback work to a `DiscoveryScan` row: matches the
 * raw host list against existing devices, summarizes counts, persists the
 * row + audit entry, and refreshes `lastSeen` on matched devices.
 *
 * Extracted from `POST /api/discovery/scan`'s inline callback so the route
 * stays focused on validation + dispatch. The call site fires this without
 * awaiting (fire-and-forget after `runPingScan`); we still try/catch around
 * the whole body so a partial-update mid-flight gets the scan row marked
 * `failed` and stops the client poll loop.
 */
export async function completeScan(args: CompleteScanArgs): Promise<void> {
  const { scanId, organizationId, userId, subnet, result } = args;

  try {
    if (result.kind === "error") {
      // Conditional update — if the scan was cancelled in flight, the row
      // is already in a terminal state (`status: "cancelled"`) and we must
      // not overwrite it. Same pattern below for the success branch.
      await withTenant(organizationId, (tx) =>
        tx.discoveryScan.updateMany({
          where: {
            id: scanId,
            organizationId,
            status: { in: ["pending", "running"] },
          },
          data: {
            status: "failed",
            error: result.error,
            completedAt: new Date(),
          },
        }),
      );
      return;
    }

    const devices = await withTenant(organizationId, (tx) =>
      tx.device.findMany({
        where: { organizationId },
        select: {
          id: true,
          name: true,
          ipAddress: true,
          macAddress: true,
          hostname: true,
        },
      }),
    );
    const deviceById = new Map(devices.map((d) => [d.id, d]));

    const enriched = result.hosts.map((host) => ({
      ...host,
      match: matchHost(host, devices),
      typeGuess: guessDeviceType(host),
      // Per-host action state; set when user approves/ignores/assigns
      actionState: "pending" as const,
    }));

    const hostsNew = enriched.filter((h) => h.match.kind === "new").length;
    const hostsKnown = enriched.filter((h) => h.match.kind === "known").length;

    const writeResult = await withTenant(organizationId, (tx) =>
      tx.discoveryScan.updateMany({
        where: {
          id: scanId,
          organizationId,
          status: { in: ["pending", "running"] },
        },
        data: {
          status: "completed",
          hostsFound: enriched.length,
          hostsNew,
          hostsKnown,
          duration: result.durationSec,
          results: { hosts: enriched },
          completedAt: new Date(),
        },
      }),
    );
    // count===0 means the user cancelled (or otherwise terminated) the scan
    // between dispatch and this callback. Skip the audit + device updates
    // so we don't grow the scan_completed log with a row that semantically
    // never completed.
    if (writeResult.count === 0) return;

    await audit({
      userId,
      organizationId,
      action: "scan_completed",
      entityType: "discovery_scan",
      entityId: scanId,
      metadata: {
        subnet,
        hostsFound: enriched.length,
        hostsNew,
        hostsKnown,
        duration: result.durationSec,
      },
    });

    // Refresh lastSeen on matched devices so the inventory page reflects
    // the most recent successful scan. Two writes:
    //   1. Bulk `updateMany` for lastSeen across every matched id (one query).
    //   2. Per-device backfill (Promise.all) of hostname / MAC / vendor when
    //      the existing device row is missing that field. nmap now captures
    //      MAC + vendor (XML output), so a host matched by IP can fill in a
    //      device that predates the MAC capture. Skipped when nothing to fill.
    const lastSeenAt = new Date();
    const knownDeviceIds = Array.from(
      new Set(
        enriched.flatMap((h) =>
          h.match.kind === "known" ? [h.match.deviceId] : [],
        ),
      ),
    );
    const fieldBackfills = new Map<
      string,
      { hostname?: string; macAddress?: string }
    >();
    for (const h of enriched) {
      if (h.match.kind !== "known") continue;
      const device = deviceById.get(h.match.deviceId);
      if (!device) continue;
      const patch: { hostname?: string; macAddress?: string } = {};
      if (h.hostname && !device.hostname) patch.hostname = h.hostname;
      if (h.mac && !device.macAddress) patch.macAddress = h.mac;
      if (Object.keys(patch).length > 0) {
        fieldBackfills.set(h.match.deviceId, {
          ...fieldBackfills.get(h.match.deviceId),
          ...patch,
        });
      }
    }

    if (knownDeviceIds.length > 0) {
      await withTenant(organizationId, async (tx) => {
        await tx.device.updateMany({
          where: { id: { in: knownDeviceIds }, organizationId },
          data: { lastSeen: lastSeenAt },
        });
        if (fieldBackfills.size > 0) {
          await Promise.all(
            Array.from(fieldBackfills.entries()).map(([deviceId, data]) =>
              tx.device.update({
                where: { id: deviceId },
                data,
              }),
            ),
          );
        }
      });
    }
  } catch (err) {
    // Post-processing failed mid-flight — the DB may be partially updated
    // (some Device upserts committed before the throw). Best-effort mark
    // the scan row as failed so the UI stops polling; if *that* update
    // also fails, we still want a trail, so log both errors.
    console.error("Scan post-processing failed:", err);
    try {
      // Same conditional update as above — never overwrite a terminal
      // status (cancelled/failed/completed) with our recovery write.
      await withTenant(organizationId, (tx) =>
        tx.discoveryScan.updateMany({
          where: {
            id: scanId,
            organizationId,
            status: { in: ["pending", "running"] },
          },
          data: {
            status: "failed",
            error: describeError(err, "Post-processing failed"),
            completedAt: new Date(),
          },
        }),
      );
    } catch (recoveryErr) {
      console.error(
        "[discovery.scan] recovery update also failed",
        { scanId },
        recoveryErr,
      );
    }
  }
}
